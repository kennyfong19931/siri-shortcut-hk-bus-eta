import https from 'https';
import fs from 'fs';
import os from 'os';
import path from 'path';
import StreamZip from 'node-stream-zip';
import parser from 'stream-json';
import Pick from 'stream-json/filters/Pick';
import StreamArray from 'stream-json/streamers/StreamArray';
import Chain from 'stream-chain';
import proj4 from 'proj4';
import xml2js from 'xml2js';

import logger from "./utils/logger";
import { COMPANY } from "./constant";

const metadataUrl = 'https://portal.csdi.gov.hk/csdi-webpage/metadata/td_rcd_1638844988873_41214';
const routeFolder = path.join("public", "api", "route");
const outputFolder = path.join("public", "api", "spatial");
proj4.defs("EPSG:2326", "+proj=tmerc +lat_0=22.31213333333334 +lon_0=114.1785555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.959,-161.764,0.067753,-2.24365,-1.15883,-1.09425 +units=m +no_defs");

const praseData = async () => {
    logger.info(`Step 1: Download Data`);

    logger.info(`Step 1.1: Find GeoJSON URL`);
    let geojsonUrl;
    let xmlData = '';
    await new Promise((resolve, reject) => {
        https.get(metadataUrl, function(res) {
            res.on('data', function(data_) { xmlData += data_.toString(); });
            res.on('end', function () {
                xml2js.Parser().parseString(xmlData, function (err, result) {
                    const formatList = result['gmd:MD_Metadata']['gmd:distributionInfo'][0]['gmd:MD_Distribution'][0]['gmd:transferOptions'];
                    const formatGeoJson = formatList.filter(obj => obj['gmd:MD_DigitalTransferOptions'][0]['gmd:onLine'][0]['gmd:CI_OnlineResource'][0]['gmd:applicationProfile'][0]['gco:CharacterString'][0] === 'GEOJSON');
                    geojsonUrl = formatGeoJson[0]['gmd:MD_DigitalTransferOptions'][0]['gmd:onLine'][0]['gmd:CI_OnlineResource'][0]['gmd:linkage'][0]['gmd:URL'][0];
                    resolve('finish');
                });
            });
        });
    });
    logger.info(`geojsonUrl = ${geojsonUrl}`);

    const zipPath = path.join(os.tmpdir(), 'BusRoute_GEOJSON.zip');
    logger.info(`zipPath = ${zipPath}`);
    await new Promise((resolve, reject) => {
        const zipFileWriteStream = fs.createWriteStream(zipPath);
        const request = https.get(geojsonUrl, function (response) {
            response.pipe(zipFileWriteStream);
        });

        // after download completed close filestream
        zipFileWriteStream.on('finish', () => {
            zipFileWriteStream.close();
            resolve('finish');
            logger.info('Download success');
        });

        zipFileWriteStream.on('error', err => {
            fs.unlink(zipPath, () => reject(err));
        });

        request.end();
    });

    logger.info(`Step 1.2: Unzip`);
    const zip = new StreamZip.async({ file: zipPath });
    await zip.extract(null, os.tmpdir());
    await zip.close();

    try {
        logger.info(`Step 2: Read data`);
        let result = [];
        const jsonArray = new Chain([
            fs.createReadStream(path.join(os.tmpdir(), "FB_ROUTE_LINE.json")),
            parser(),
            new Pick({ filter: 'features' }),
            new StreamArray(),
        ]);

        for await (const { value } of jsonArray) {
            result.push({
                company: value.properties.COMPANY_CODE,
                geometry: value.geometry.coordinates.map(a => {
                    if (Array.isArray(a[0])) {
                        return a.map(b => proj4('EPSG:2326', 'EPSG:4326', b).reverse());
                    } else {
                        return proj4('EPSG:2326', 'EPSG:4326', a).reverse();
                    }
                }),
                route: value.properties.ROUTE_NAMEE,
                routeId: value.properties.ROUTE_ID,
                routeSeq: value.properties.ROUTE_SEQ,
                startStop: value.properties.ST_STOP_NAMEC,
                endStop: value.properties.ED_STOP_NAMEC,
            });
        }

        logger.info(`Step 3: Group data by company`);
        return result.reduce(function (accumulator, currentValue) {
            currentValue.company.split('+').forEach(function (company) {
                let tempCurrentValue = currentValue;
                switch (company) {
                    case 'KMB':
                    case 'LWB':
                        tempCurrentValue.company = COMPANY.KMB.CODE;
                        break;
                    case 'CTB':
                    case 'NWFB':
                        tempCurrentValue.company = COMPANY.CTB.CODE;
                        break;
                    case 'NLB':
                        tempCurrentValue.company = COMPANY.NLB.CODE;
                        break;
                    case 'LRTFeeder':
                        tempCurrentValue.company = COMPANY.MTR.CODE;
                        break;
                    case 'GMB':
                        tempCurrentValue.company = COMPANY.GMB.CODE;
                        break;
                }
                accumulator.set(tempCurrentValue.company, [...accumulator.get(tempCurrentValue.company) || [], tempCurrentValue])
            });
            return accumulator;
        }, new Map());
    } catch (err) {
        logger.error(`[praseData]`, err);
    }
};

const getFilename = (company: string, route: string, startStop: string, endStop: string) => {
    const regex = /[\s(（)）](?:循環線)*/g;
    startStop = startStop.replace(regex, '');
    endStop = endStop.replace(regex, '');

    let filename = null;
    const routeFile = path.join(routeFolder, route + '.json');
    if (fs.existsSync(routeFile)) {
        let rawdata = fs.readFileSync(routeFile, 'utf8');
        let json = JSON.parse(rawdata);
        let matchedRoute = json.filter(route => route.company === company && route.stopList.length > 0 &&
            (
                /* match by stop name */
                (
                    (route.stopList.at(0).name.replace(regex, '').includes(startStop) || startStop.includes(route.stopList.at(0).name.replace(regex, ''))) ||
                    (route.stopList.at(-1).name.replace(regex, '').includes(endStop) || endStop.includes(route.stopList.at(-1).name.replace(regex, '')))
                ) ||
                /* match by route orig dest*/
                (
                    (route.orig.replace(regex, '').includes(startStop) || startStop.includes(route.orig.replace(regex, ''))) ||
                    (route.dest.replace(regex, '').includes(endStop) || endStop.includes(route.dest.replace(regex, '')))
                )
            )
        );
        if (matchedRoute.length > 0) {
            if (COMPANY.KMB.CODE === company) {
                filename = `${matchedRoute[0].dir}_${matchedRoute[0].routeType}.json`;
            } else if (COMPANY.NLB.CODE === company) {
                filename = `${matchedRoute[0].routeId}.json`;
            } else {
                filename = `${matchedRoute[0].dir}.json`;
            }
        }
    }
    return filename;
};

(async function () {
    logger.info('Start');
    await praseData()
        .then(data => {
            logger.info(`Step 4: Save result to file`);
            if (fs.existsSync(outputFolder)) {
                fs.rmSync(outputFolder, { recursive: true });
            }
            data.forEach((value, key) => {
                logger.info(`Start ${key}`);

                value.forEach(geoJson => {
                    let company = key;
                    let route = geoJson.route;
                    let startStop = geoJson.startStop;
                    let endStop = geoJson.endStop;
                    // special handling start
                    // for MTR bus run by KMB
                    if (company === COMPANY.KMB.CODE && ['K12', 'K14', 'K17', 'K18'].includes(route)) {
                        company = COMPANY.MTR.CODE;
                    }
                    // for KMB 213X
                    if (company === COMPANY.KMB.CODE && route === '213X') {
                        startStop = startStop.replace('恒', '恆');
                        endStop = endStop.replace('恒', '恆');
                    }
                    // for CTB 61R,88R, route number is different from TD
                    if (company === COMPANY.CTB.CODE && ['NR61', 'NR88'].includes(route)) {
                        if(route === 'NR61') {
                            route = '61R';
                        } else if (route === 'NR88') {
                            route = '88R';
                        }
                    }
                    // special handling end

                    const folder = path.join(outputFolder, company, route);
                    fs.mkdirSync(folder, { recursive: true });

                    let f = getFilename(company, route, startStop, endStop);
                    if (f) {
                        let filename = path.join(folder, f);
                        if (fs.existsSync(filename)) {  // skip route already created (e.g. route variation)
                            return;
                        }

                        let data = JSON.stringify(geoJson.geometry);

                        fs.writeFileSync(filename, data);
                    } else {
                        logger.warn(`Skipped [${company}] ${route} (${startStop} - ${endStop}), cannot match route`);
                    }
                });
                logger.info(`End ${key}`);
            });
        });
    logger.info('End');
})();
