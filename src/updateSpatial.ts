import https from 'https';
import fs from 'fs';
import gdal from 'gdal-async';
import os from 'os';
import path from 'path';
import xml2js from 'xml2js';

import logger from './utils/logger';
import { COMPANY } from './constant';
import { doRequest } from './utils/requestUtil';
import SpatialUtil from './utils/spatialUtil';

const routeFolder = path.join('public', 'api', 'route');
const outputFolder = path.join('public', 'api', 'spatial');

const getCsdiRoute = async (type) => {
    logger.info(`Step 1: Download Data`);
    const isMinibus = type === 'MINIBUS';

    logger.info(`Step 1.1: Find ZIP URL`);
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
            resolve('finish');
            logger.info('Download success');
        });

        zipFileWriteStream.on('error', (err) => {
            fs.unlink(zipPath, () => reject(err));
        });

        request.end();
    });

    try {
        logger.info(`Step 2: Read data`);
        let result = [];
        const dataset = gdal.open(zipPath);
        dataset.layers.get(0).features.forEach((feature, i) => {
            const properties = feature.fields.toObject();
            const geometry = feature
                .getGeometry()
                .toObject()
                .coordinates.map((a) => {
                    if (Array.isArray(a[0])) {
                        return a.map((b) => SpatialUtil.fromHK80ToWGS84(b));
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

const getFilename = (company: string, route: string, startStop: string, endStop: string) => {
    const regex = /[\s(（)）](?:循環線)*/g;
    startStop = startStop.replace(regex, '');
    endStop = endStop.replace(regex, '');

    let filename = null;
    const routeFile = path.join(routeFolder, route + '.json');
    if (fs.existsSync(routeFile)) {
        let rawdata = fs.readFileSync(routeFile, 'utf8');
        let json = JSON.parse(rawdata);
        let matchedRoute = json
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

const isStringOverlap = (str1: string, str2: string) => {
    return str1.includes(str2) || str2.includes(str1);
};

async function getCompanyRoute(companyCode: string) {
    logger.info(`Step 1: Get data from OpenStreetMap`);
    const queue = [];
    const resultList = [];
    if (companyCode === COMPANY.MTR_HR.CODE) {
        queue.push({ route: 'AEL', relationId: 5317239 });
        queue.push({ route: 'EAL', relationId: [4248592, 4250434] });
        queue.push({ route: 'ISL', relationId: 4432666 });
        queue.push({ route: 'KTL', relationId: 6452935 });
        queue.push({ route: 'TML', relationId: 6102299 });
        queue.push({ route: 'TCL', relationId: 5317706 });
        queue.push({ route: 'TKL', relationId: [269672, 9736610] });
        queue.push({ route: 'TWL', relationId: 269669 });
        queue.push({ route: 'SIL', relationId: 6827211 });
        queue.push({ route: 'DRL', relationId: 4709540 });
    } else if (companyCode === COMPANY.MTR_LR.CODE) {
        queue.push({ route: '505', startStop: '兆康', endStop: '三聖', relationId: 3515354 });
        queue.push({ route: '505', startStop: '三聖', endStop: '兆康', relationId: 6481282 });
        queue.push({ route: '507', startStop: '田景', endStop: '屯門碼頭', relationId: 6481316 });
        queue.push({ route: '507', startStop: '屯門碼頭', endStop: '田景', relationId: 3679916 });
        queue.push({ route: '610', startStop: '元朗', endStop: '屯門碼頭', relationId: 6481420 });
        queue.push({ route: '610', startStop: '屯門碼頭', endStop: '元朗', relationId: 3680161 });
        queue.push({ route: '614', startStop: '元朗', endStop: '屯門碼頭', relationId: 3680323 });
        queue.push({ route: '614', startStop: '屯門碼頭', endStop: '元朗', relationId: 6485194 });
        queue.push({ route: '614P', startStop: '兆康', endStop: '屯門碼頭', relationId: 5955256 });
        queue.push({ route: '614P', startStop: '屯門碼頭', endStop: '兆康', relationId: 5955257 });
        queue.push({ route: '615', startStop: '元朗', endStop: '屯門碼頭', relationId: 3680520 });
        queue.push({ route: '615', startStop: '屯門碼頭', endStop: '元朗', relationId: 6481434 });
        queue.push({ route: '615P', startStop: '兆康', endStop: '屯門碼頭', relationId: 5955258 });
        queue.push({ route: '615P', startStop: '屯門碼頭', endStop: '兆康', relationId: 5955259 });
        queue.push({ route: '705', startStop: '天水圍', endStop: '天逸', relationId: 2941692 });
        queue.push({ route: '705', startStop: '天逸', endStop: '天水圍', relationId: 2941692 });
        queue.push({ route: '706', startStop: '天水圍', endStop: '天逸', relationId: 2941790 });
        queue.push({ route: '706', startStop: '天逸', endStop: '天水圍', relationId: 2941790 });
        queue.push({ route: '751', startStop: '天逸', endStop: '友愛', relationId: 2926506 });
        queue.push({ route: '751', startStop: '友愛', endStop: '天逸', relationId: 6485218 });
        queue.push({ route: '761P', startStop: '天逸', endStop: '元朗', relationId: 6485221 });
        queue.push({ route: '761P', startStop: '元朗', endStop: '天逸', relationId: 2942633 });
    } else if (companyCode === COMPANY.MTR.CODE) {
        queue.push({ route: '506', startStop: '屯門碼頭', endStop: '兆麟', relationId: 2230969 });
        queue.push({ route: '506', startStop: '兆麟', endStop: '屯門碼頭', relationId: 2230969 });
        queue.push({ route: 'K51', startStop: '富泰', endStop: '大欖', relationId: 6535744 });
        queue.push({ route: 'K51', startStop: '大欖', endStop: '富泰', relationId: 6535743 });
        queue.push({ route: 'K52', startStop: '龍鼓灘', endStop: '屯門站', relationId: 5595696 });
        queue.push({ route: 'K52', startStop: '屯門站', endStop: '龍鼓灘', relationId: 6535453 });
        queue.push({ route: 'K53', startStop: '屯門站', endStop: '屯門站', relationId: 6535476 });
        queue.push({ route: 'K58', startStop: '富泰', endStop: '青山灣', relationId: 6535655 });
        queue.push({ route: 'K58', startStop: '青山灣', endStop: '富泰', relationId: 2235402 });
        queue.push({ route: 'K65', startStop: '流浮山', endStop: '元朗站', relationId: 3144224 });
        queue.push({ route: 'K65', startStop: '元朗站', endStop: '流浮山', relationId: 3128480 });
        queue.push({ route: 'K65A', startStop: '流浮山', endStop: '天水圍站', relationId: 6550897 });
        queue.push({ route: 'K65A', startStop: '天水圍站', endStop: '流浮山', relationId: 6864448 });
        queue.push({ route: 'K66', startStop: '大棠', endStop: '朗屏', relationId: 3174921 });
        queue.push({ route: 'K66', startStop: '朗屏', endStop: '大棠', relationId: 3174915 });
        queue.push({ route: 'K68', startStop: '元朗工業邨', endStop: '元朗工業邨', relationId: 5608554 });
        queue.push({ route: 'K73', startStop: '天恆', endStop: '元朗（西）', relationId: 6551092 });
        queue.push({ route: 'K73', startStop: '元朗（西）', endStop: '天恆', relationId: 6698574 });
        queue.push({ route: 'K74', startStop: '天水圍市中心', endStop: '天水圍市中心', relationId: 6563799 });
        queue.push({ route: 'K75A', startStop: '天水圍站', endStop: '天水圍站', relationId: 6482275 });
        queue.push({ route: 'K75P', startStop: '天瑞', endStop: '天瑞', relationId: 6482276 });
        queue.push({ route: 'K76', startStop: '天恆', endStop: '天水圍站', relationId: 3178687 });
        queue.push({ route: 'K76', startStop: '天水圍站', endStop: '天恆', relationId: 3178676 });
    }
    logger.info(`company: ${companyCode}, size: ${queue.length}`);
    for (let queueElement of queue) {
        resultList.push({
            ...queueElement,
            geometry: await callOverpassApi(queueElement.relationId),
        });
        // add wait time for each call
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return resultList;
}

/**
 * Get spatial data from OpenStreetMap
 *
 * See {@link https://wiki.openstreetmap.org/wiki/Overpass_API|Overpass API}
 *
 * @param relationId ref: {@link https://wiki.openstreetmap.org/wiki/Hong_Kong/Transport/Routes}
 */
async function callOverpassApi(relationId: number | number[]) {
    const bboxHK = '22.139,113.829,22.57,114.508';
    let query = `[bbox:${bboxHK}][out:json][timeout:25];`;
    if (Array.isArray(relationId)) {
        let tempQuery = [];
        for (let id of relationId) {
            tempQuery.push(`rel(${id});`);
        }
        query += `(${tempQuery.join('')});`;
    } else {
        query += `rel(${relationId});`;
    }
    query += `out geom;`;
    return await doRequest(
        'POST',
        'https://overpass-api.de/api/interpreter',
        null,
        'data=' + encodeURIComponent(query),
        'formData',
    ).then((json) => {
        return json.elements
            .flatMap((element) => element.members)
            .filter(
                (member, index, array) =>
                    member.type === 'way' &&
                    member.role === '' &&
                    index === array.findIndex((o) => o.ref === member.ref), // remove duplicate way
            )
            .map((member) =>
                member.geometry.map((geom) => [parseFloat(geom.lat).toFixed(5), parseFloat(geom.lon).toFixed(5)]),
            );
    });
}

(async function () {
    logger.info('Start');
    await Promise.all([
        getCsdiRoute('BUS'),
        getCsdiRoute('MINIBUS'),
        getCompanyRoute(COMPANY.MTR_HR.CODE),
        getCompanyRoute(COMPANY.MTR_LR.CODE),
        getCompanyRoute(COMPANY.MTR.CODE),
    ]).then(([csdi, minibus, mtr_hr, mtr_lr, mtr]) => {
        logger.info(`Step 4: Save result to file`);
        if (fs.existsSync(path.join(outputFolder))) {
            fs.rmSync(path.join(outputFolder), { recursive: true });
        }

        logger.info(`Step 4.1: Save CSDI data`);
        csdi.forEach((value, key) => {
            logger.info(`Start ${key}`);
            value.forEach((geoJson) => {
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
                    if (route === 'NR61') {
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
                    if (fs.existsSync(filename)) {
                        // skip route already created (e.g. route variation)
                        logger.info(`Skipped [${company}] ${route} (${startStop} - ${endStop}), already created`);
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

        logger.info(`Step 4.2: Save MTR HR data`);
        mtr_hr.forEach((value) => {
            const company = COMPANY.MTR_HR.CODE;
            const route = value.route;
            const folder = path.join(outputFolder, company);
            fs.mkdirSync(folder, { recursive: true });
            let filename = path.join(folder, `${route}.json`);
            let data = JSON.stringify(value.geometry);
            fs.writeFileSync(filename, data);
        });

        logger.info(`Step 4.3: Save MTR LR data`);
        mtr_lr.forEach((value) => {
            const company = COMPANY.MTR_LR.CODE;
            const route = value.route;
            const startStop = value.startStop;
            const endStop = value.endStop;
            const folder = path.join(outputFolder, company, route);
            fs.mkdirSync(folder, { recursive: true });
            let f = getFilename(company, route, startStop, endStop);
            if (f) {
                let filename = path.join(folder, f);
                let data = JSON.stringify(value.geometry);
                fs.writeFileSync(filename, data);
            } else {
                logger.warn(`Skipped [${company}] ${route} (${startStop} - ${endStop}), cannot match route`);
            }
        });

        logger.info(`Step 4.4: Save MTR data`);
        mtr.forEach((value) => {
            const company = COMPANY.MTR.CODE;
            const route = value.route;
            const startStop = value.startStop;
            const endStop = value.endStop;
            const folder = path.join(outputFolder, company, route);
            fs.mkdirSync(folder, { recursive: true });
            let f = getFilename(company, route, startStop, endStop);
            if (f) {
                let filename = path.join(folder, f);
                let data = JSON.stringify(value.geometry);
                fs.writeFileSync(filename, data);
            } else {
                logger.warn(`Skipped [${company}] ${route} (${startStop} - ${endStop}), cannot match route`);
            }
        });

        logger.info(`Step 4.5: Save minibus data`);
        minibus.forEach((value, key) => {
            value.forEach((geoJson) => {
                let company = key;
                let route = geoJson.route;
                let routeId = geoJson.routeId;
                let routeType = geoJson.routeSeq;

                const folder = path.join(outputFolder, company, route);
                fs.mkdirSync(folder, { recursive: true });
                let filename = path.join(folder, `${routeId}_${routeType}.json`);
                if (fs.existsSync(filename)) {
                    // skip route already created (e.g. route variation)
                    logger.info(`Skipped [${company}] ${route} (${filename}), already created`);
                    return;
                }
                let data = JSON.stringify(geoJson.geometry);
                fs.writeFileSync(filename, data);
            });
            logger.info(`End ${key}`);
        });
    });
    logger.info('End');
})();
