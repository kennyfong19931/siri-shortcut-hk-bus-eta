import https from 'https';
import fs from 'fs';
import gdal from 'gdal-async';
import os from 'os';
import path from 'path';
import xml2js from 'xml2js';

import logger from './utils/logger';
import { COMPANY, COORDINATE_DP } from './constant';
import GeneralUtil from './utils/generalUtil';
import { telegramPost } from './utils/requestUtil';
import SpatialUtil from './utils/spatialUtil';
import osmConfig from '../osm/osm_config.json';

const routeFolder = path.join('public', 'api', 'route');
const outputFolder = path.join('public', 'api', 'spatial');
const osmFolder = path.join('osm');

const isCsdiUpdated = async (type: string) => {
    const isMinibus = type === 'MINIBUS';
    let csdiLastUpdate;
    let xmlData = '';
    const url = `https://portal.csdi.gov.hk/csdi-webpage/metadata/${isMinibus ? 'td_rcd_1697082463580_57453' : 'td_rcd_1638844988873_41214'}`;
    await new Promise((resolve, reject) => {
        https.get(url, function (res) {
            res.on('data', function (data_) {
                xmlData += data_.toString();
            });
            res.on('end', function () {
                xml2js.Parser().parseString(xmlData, function (err, result) {
                    csdiLastUpdate =
                        result['gmd:MD_Metadata']['gmd:identificationInfo'][0]['gmd:MD_DataIdentification'][0][
                            'gmd:citation'
                        ][0]['gmd:CI_Citation'][0]['gmd:date'][1]['gmd:CI_Date'][0]['gmd:date'][0]['gco:Date'][0];
                    resolve('finish');
                });
            });
        });
    });

    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
    }
    const lastUpdate = !fs.existsSync(path.join(outputFolder, `lastUpdate_${type}.txt`))
        ? ''
        : fs.readFileSync(path.join(outputFolder, `lastUpdate_${type}.txt`), 'utf8');
    if (lastUpdate === csdiLastUpdate) {
        logger.info(`${type} lastUpdate: ${lastUpdate}, csdiLastUpdate: ${csdiLastUpdate}, No update needed`);
        return false;
    } else {
        fs.writeFileSync(path.join(outputFolder, `lastUpdate_${type}.txt`), csdiLastUpdate);
        if (process.env.FORCE_UPDATE === 'false') {
            telegramPost(`${type} CSDI route updated: ${csdiLastUpdate}`);
        }
        return true;
    }
};

const getCsdiRoute = async (type: string) => {
    logger.info(`Step 1: Download CSDI ${type} Data`);
    const isMinibus = type === 'MINIBUS';
    let fileId;
    let xmlData = '';
    const url = `https://portal.csdi.gov.hk/csdi-webpage/metadata/${isMinibus ? 'td_rcd_1697082463580_57453' : 'td_rcd_1638844988873_41214'}`;
    await new Promise((resolve, reject) => {
        https.get(url, function (res) {
            res.on('data', function (data_) {
                xmlData += data_.toString();
            });
            res.on('end', function () {
                xml2js.Parser().parseString(xmlData, function (err, result) {
                    fileId = result['gmd:MD_Metadata']['gmd:fileIdentifier'][0]['gco:CharacterString'][0];
                    fileId = fileId.replaceAll('-', '');
                    resolve('finish');
                });
            });
        });
    });
    const zipUrl = `https://static.csdi.gov.hk/csdi-webpage/download/${fileId}/fgdb`;
    logger.info(`zipUrl = ${zipUrl}`);

    const zipPath = path.join(os.tmpdir(), `${type}_FGDB.gdb.zip`);
    logger.info(`zipPath = ${zipPath}`);
    await new Promise((resolve, reject) => {
        const zipFileWriteStream = fs.createWriteStream(zipPath);
        const request = https.get(zipUrl, function (response) {
            response.pipe(zipFileWriteStream);
        });

        // after download completed close filestream
        zipFileWriteStream.on('finish', () => {
            zipFileWriteStream.close();
            logger.info('Download success');
            fs.stat(zipPath, (err, stats) => {
                if (err) {
                    logger.error('Cannot read zip file', err);
                } else {
                    logger.info(`Filesize for ${type} = ${stats.size / 1024 / 1024} MB`);
                }
            });
            resolve('finish');
        });

        zipFileWriteStream.on('error', (err) => {
            fs.unlink(zipPath, () => reject(err));
        });

        request.end();
    });

    try {
        logger.info(`Step 2: Read ${type} data`);
        let result = [];
        const dataset = gdal.open(zipPath);
        dataset.layers.get(0).features.forEach((feature, i) => {
            const properties = feature.fields.toObject();
            const geometry = feature
                .getGeometry()
                .toObject()
                .coordinates.map((a) => {
                    if (Array.isArray(a[0])) {
                        // remove duplicate points after convert to WGS84
                        return removeDuplicateSubArrays(a.map((b) => SpatialUtil.fromHK80ToWGS84(b)));
                    } else {
                        return SpatialUtil.fromHK80ToWGS84(a);
                    }
                });
            result.push({
                company: isMinibus ? 'GMB' : properties.COMPANY_CODE,
                geometry: geometry,
                route: isMinibus ? properties.ROUTE_NAME : properties.ROUTE_NAMEE,
                routeId: properties.ROUTE_ID,
                routeSeq: properties.ROUTE_SEQ,
                startStop: properties.ST_STOP_NAMEC,
                endStop: properties.ED_STOP_NAMEC,
            });
        });

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
                accumulator.set(tempCurrentValue.company, [
                    ...(accumulator.get(tempCurrentValue.company) || []),
                    tempCurrentValue,
                ]);
            });
            return accumulator;
        }, new Map());
    } catch (err) {
        logger.error(`[praseData]`, err);
    }
};

const getFilename = (
    company: string,
    route: string,
    gtfsId: string,
    routeType: string,
    startStop: string,
    endStop: string,
) => {
    let filename = null;
    const routeFile = path.join(routeFolder, route + '.json');
    if (fs.existsSync(routeFile)) {
        let rawdata = fs.readFileSync(routeFile, 'utf8');
        let json = JSON.parse(rawdata);
        let matchedRoute;
        if (gtfsId) {
            matchedRoute = json.filter((route) => route.company === company && route.gtfsId === gtfsId);
        }
        if (matchedRoute == null && routeType != null) {
            matchedRoute = json.filter((route) => route.company === company && route.routeType === routeType);
        }
        if (matchedRoute == null && startStop != null && endStop != null) {
            const regex = /[\s(（)）](?:循環線)*/g;
            startStop = startStop.replace(regex, '');
            endStop = endStop.replace(regex, '');
            matchedRoute = json
                .filter(
                    (route) =>
                        route.company === company &&
                        route.stopList.length > 0 &&
                        /* match by stop name */
                        (isStringOverlap(startStop, route.stopList.at(0).name.replace(regex, '')) ||
                            isStringOverlap(endStop, route.stopList.at(-1).name.replace(regex, '')) ||
                            /* match by route orig dest*/
                            isStringOverlap(startStop, route.orig.replace(regex, '')) ||
                            isStringOverlap(endStop, route.dest.replace(regex, ''))),
                )
                .sort((a, b) => {
                    let matchCountA = 0,
                        matchCountB = 0;
                    if (isStringOverlap(startStop, a.stopList.at(0).name.replace(regex, ''))) {
                        matchCountA++;
                    }
                    if (isStringOverlap(endStop, a.stopList.at(-1).name.replace(regex, ''))) {
                        matchCountA++;
                    }
                    if (isStringOverlap(startStop, a.orig.replace(regex, ''))) {
                        matchCountA++;
                    }
                    if (isStringOverlap(endStop, a.dest.replace(regex, ''))) {
                        matchCountA++;
                    }
                    if (isStringOverlap(startStop, b.stopList.at(0).name.replace(regex, ''))) {
                        matchCountB++;
                    }
                    if (isStringOverlap(endStop, b.stopList.at(-1).name.replace(regex, ''))) {
                        matchCountB++;
                    }
                    if (isStringOverlap(startStop, b.orig.replace(regex, ''))) {
                        matchCountB++;
                    }
                    if (isStringOverlap(endStop, b.dest.replace(regex, ''))) {
                        matchCountB++;
                    }
                    if (matchCountA > matchCountB) {
                        return -1;
                    } else if (matchCountA < matchCountB) {
                        return 1;
                    } else {
                        return 0;
                    }
                });
        }
        if (matchedRoute) {
            filename = matchedRoute.map((route) => {
                if (COMPANY.KMB.CODE === company) {
                    return `${route.dir}_${route.routeType}.json`;
                } else if (COMPANY.NLB.CODE === company) {
                    return `${route.routeId}.json`;
                } else if (COMPANY.MTR.CODE === company) {
                    return `${route.routeType}.json`;
                } else {
                    return `${route.dir}.json`;
                }
            });
        }
    }
    return filename;
};

const isStringOverlap = (str1: string, str2: string) => {
    return str1.includes(str2) || str2.includes(str1);
};

const removeDuplicateSubArrays = <T>(items: T[]): T[] => {
    const seen = new Set<string>();
    return items.filter((item) => {
        const key = JSON.stringify(item);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};

async function getCompanyRoute(companyCode: string) {
    logger.info(`Step 1: Get data from OpenStreetMap`);
    return osmConfig[companyCode]
        .map((route) => {
            let geometry = [];
            const seenFeatureIds = new Set();
            for (const relationId of route.relationId) {
                const filePath = path.join(osmFolder, `${relationId}.geojson`);
                if (fs.existsSync(filePath)) {
                    const rawdata = fs.readFileSync(filePath, 'utf8');
                    const json = JSON.parse(rawdata);
                    if (json && Array.isArray(json.features)) {
                        json.features.forEach((feature) => {
                            const fid = feature.properties && feature.properties['@id'];
                            if (!fid || seenFeatureIds.has(fid)) return;
                            seenFeatureIds.add(fid);
                            // GeoJSON coords are [lon, lat] -> convert to [lat, lon]
                            const coords = feature.geometry.coordinates.map((c: any) => {
                                return [
                                    parseFloat(parseFloat(c[1]).toFixed(COORDINATE_DP)),
                                    parseFloat(parseFloat(c[0]).toFixed(COORDINATE_DP)),
                                ];
                            });
                            geometry.push(coords);
                        });
                    }
                }
            }
            if (geometry.length > 0) {
                return {
                    ...route,
                    geometry,
                };
            } else {
                return null;
            }
        })
        .filter((json) => !!json);
}

(async function () {
    logger.info('Start');
    const [busUpdate, minibusUpdate] = await Promise.all([isCsdiUpdated('BUS'), isCsdiUpdated('MINIBUS')]);
    if (process.env.FORCE_UPDATE === 'false' && busUpdate === false && minibusUpdate === false) {
        logger.info('End');
        return;
    }

    await Promise.all([
        getCsdiRoute('BUS'),
        getCsdiRoute('MINIBUS'),
        getCompanyRoute(COMPANY.MTR_HR.CODE),
        getCompanyRoute(COMPANY.MTR_LR.CODE),
        getCompanyRoute(COMPANY.MTR.CODE),
    ]).then(([bus, minibus, mtr_hr, mtr_lr, mtr]) => {
        logger.info(`Step 4: Save result to file`);

        logger.info(`Step 4.1: Save CSDI BUS data`);
        fs.rmSync(path.join(outputFolder, COMPANY.MTR.CODE), { recursive: true });
        bus.forEach((value, key) => {
            logger.info(`Start ${key}`);
            if (fs.existsSync(path.join(outputFolder, key))) {
                fs.rmSync(path.join(outputFolder, key), { recursive: true });
            }
            value.forEach((csdiRecord) => {
                const { company, route } = GeneralUtil.gtfsSpecialHandling(key, csdiRecord.route);
                const folder = path.join(outputFolder, company, route);
                fs.mkdirSync(folder, { recursive: true });
                const gtfsId = `${csdiRecord.routeId}_${csdiRecord.routeSeq}`;
                const filename = getFilename(company, route, gtfsId, null, null, null);
                if (filename) {
                    for (const f of filename) {
                        const file = path.join(folder, f);
                        if (fs.existsSync(file)) {
                            // skip route already created (e.g. route variation)
                            logger.info(
                                `Skipped [${company}] ${route} ${gtfsId} (${csdiRecord.startStop} - ${csdiRecord.endStop}), already created`,
                            );
                            return;
                        }
                        fs.writeFileSync(file, JSON.stringify(csdiRecord.geometry));
                    }
                } else {
                    logger.warn(
                        `Skipped [${company}] ${route} ${gtfsId} (${csdiRecord.startStop} - ${csdiRecord.endStop}), cannot match route`,
                    );
                }
            });
            logger.info(`End ${key}`);
        });

        logger.info(`Step 4.2: Save CSDI MINIBUS data`);
        minibus.forEach((value, key) => {
            const company = key;
            const gmbFolder = path.join(outputFolder, company);
            if (fs.existsSync(gmbFolder)) {
                fs.rmSync(gmbFolder, { recursive: true });
            }
            value.forEach((csdiRecord) => {
                const route = csdiRecord.route;
                const folder = path.join(gmbFolder, route);
                fs.mkdirSync(folder, { recursive: true });
                const filename = `${csdiRecord.routeId}_${csdiRecord.routeSeq}.json`;
                const file = path.join(folder, filename);
                if (fs.existsSync(file)) {
                    // skip route already created
                    logger.info(`Skipped [${company}] ${route} (${filename}), already created`);
                    return;
                }
                fs.writeFileSync(file, JSON.stringify(csdiRecord.geometry));
            });
            logger.info(`End ${key}`);
        });

        logger.info(`Step 4.3: Save MTR HR data`);
        if (fs.existsSync(path.join(outputFolder, COMPANY.MTR_HR.CODE))) {
            fs.rmSync(path.join(outputFolder, COMPANY.MTR_HR.CODE), { recursive: true });
        }
        mtr_hr.forEach((value) => {
            const company = COMPANY.MTR_HR.CODE;
            const route = value.route;
            const folder = path.join(outputFolder, company);
            fs.mkdirSync(folder, { recursive: true });
            let filename = path.join(folder, `${route}.json`);
            let data = JSON.stringify(value.geometry);
            fs.writeFileSync(filename, data);
        });
        logger.info(`End ${COMPANY.MTR_HR.CODE}`);

        logger.info(`Step 4.4: Save MTR LR data`);
        if (fs.existsSync(path.join(outputFolder, COMPANY.MTR_LR.CODE))) {
            fs.rmSync(path.join(outputFolder, COMPANY.MTR_LR.CODE), { recursive: true });
        }
        mtr_lr.forEach((value) => {
            const company = COMPANY.MTR_LR.CODE;
            const route = value.route;
            const startStop = value.startStop;
            const endStop = value.endStop;
            const folder = path.join(outputFolder, company, route);
            fs.mkdirSync(folder, { recursive: true });
            let filename = getFilename(company, route, null, null, startStop, endStop);
            if (filename) {
                for (const f of filename) {
                    let filename = path.join(folder, f);
                    let data = JSON.stringify(value.geometry);
                    fs.writeFileSync(filename, data);
                }
            } else {
                logger.warn(`Skipped [${company}] ${route} (${startStop} - ${endStop}), cannot match route`);
            }
        });
        logger.info(`End ${COMPANY.MTR_LR.CODE}`);

        logger.info(`Step 4.5: Save MTR Bus data`);
        mtr.forEach((value) => {
            const company = COMPANY.MTR.CODE;
            const route = value.route;
            const startStop = value.startStop;
            const endStop = value.endStop;
            const folder = path.join(outputFolder, company, route);
            fs.mkdirSync(folder, { recursive: true });
            let filename = getFilename(company, route, null, value.routeType, startStop, endStop);
            if (filename) {
                for (const f of filename) {
                    let filename = path.join(folder, f);
                    let data = JSON.stringify(value.geometry);
                    fs.writeFileSync(filename, data);
                }
            } else {
                logger.warn(`Skipped [${company}] ${route} (${startStop} - ${endStop}), cannot match route`);
            }
        });
        logger.info(`End ${COMPANY.MTR.CODE}`);
    });
    logger.info('End');
})();
