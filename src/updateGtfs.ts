import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import fs from 'fs';
import os from 'os';
import path from 'path';
import * as core from '@actions/core';
import { strFromU8, unzipSync } from 'fflate';
import { COMPANY } from './constant';
import { Route } from './class/Route';
import { Stop } from './class/Stop';
import logger from './utils/logger';
import { parseCsvString } from './utils/csvUtil';
import { createGtfsFareData } from './utils/gtfsFareUtil';
import GeneralUtil from './utils/generalUtil';
import { doRequest, telegramPost } from './utils/requestUtil';

const outputFolder = path.join('gtfs');
const fareOutputPath = path.join('public', 'api', 'fare.json');
const LAST_UPDATE_URL = 'https://static.data.gov.hk/td/pt-headway-en/DATA_LAST_UPDATED_DATE.csv';
const GTFS_URL = 'https://static.data.gov.hk/td/pt-headway-tc/gtfs.zip';

function normalizeCompanyCode(companyCode?: string): string | null {
    switch ((companyCode ?? '').trim()) {
        case 'KMB':
        case 'LWB':
        case 'KMB+CTB':
        case 'LWB+CTB':
            return COMPANY.KMB.CODE;
        case 'CTB':
            return COMPANY.CTB.CODE;
        case 'NLB':
            return COMPANY.NLB.CODE;
        case 'LRTFeeder':
            return COMPANY.MTR.CODE;
        case 'PI':
            return companyCode;
        default:
            // no need to match GMB, the id in GMB is same as GTFS id
            return null;
    }
}

function normalizeStopName(rawStopName?: string): string {
    return rawStopName
        .split('|')
        .map((s) => {
            let stopName = s.replace('<BR>', '');
            if (stopName.includes(']')) {
                stopName = stopName.substring(stopName.indexOf(']') + 1);
            }
            return stopName.trim();
        })
        .join('/');
}

function normalizeTripId(tripId?: string): string {
    // The trip_id is composed of: (1) route id; (2) route bound; (3) service id; (4) departure time
    if (!tripId) return '';
    const parts = tripId.split('-');
    return parts.length >= 2 ? `${parts[0]}_${parts[1]}` : tripId;
}

(async function () {
    logger.info('Start');
    logger.info('Step 1: Check last update date');
    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder);
    }
    let runUpdate = false;
    const lastUpdate = !fs.existsSync(path.join(outputFolder, 'lastUpdate.txt'))
        ? ''
        : fs.readFileSync(path.join(outputFolder, 'lastUpdate.txt'), 'utf8');
    const csvResponse: unknown = await doRequest('GET', LAST_UPDATE_URL, undefined, undefined, undefined, true);
    if (typeof csvResponse !== 'string') throw new Error('Cannot retrieve GTFS update date');
    const csvContent = csvResponse;
    const regex = /\b(\d{4}-\d{2}-\d{2})\b/;
    const m = csvContent.match(regex);
    if (!m) throw new Error('Cannot find GTFS update date');
    const csvDate = m[1];
    const hasFareData = fs.existsSync(fareOutputPath) && fs.statSync(fareOutputPath).size > 2;
    if (lastUpdate === csvDate && hasFareData) {
        logger.info(`lastUpdate: ${lastUpdate}, csvDate: ${csvDate}, No update needed`);
    } else {
        runUpdate = true;
    }
    if (!runUpdate) {
        logger.info('End');
        return;
    }

    logger.info('Step 2: Download GTFS data');
    const tempFolder = await mkdtemp(path.join(os.tmpdir(), 'hk-gtfs-'));
    let gtfsFiles: Record<string, Uint8Array>;
    try {
        const response = await fetch(GTFS_URL);
        if (!response.ok) throw new Error(`GTFS download failed: ${response.status}`);
        const zipPath = path.join(tempFolder, 'gtfs.zip');
        await writeFile(zipPath, Buffer.from(await response.arrayBuffer()));
        gtfsFiles = unzipSync(await readFile(zipPath));
    } finally {
        await rm(tempFolder, { recursive: true, force: true });
    }
    const readGtfsFile = (fileName: string) => {
        const entryName = Object.keys(gtfsFiles).find((name) => name === fileName || name.endsWith(`/${fileName}`));
        if (!entryName) throw new Error(`Missing ${fileName} in GTFS ZIP`);
        return strFromU8(gtfsFiles[entryName]);
    };
    const [routes, trips, stops, stopTimes, fareAttributes] = await Promise.all([
        parseCsvString(readGtfsFile('routes.txt')),
        parseCsvString(readGtfsFile('trips.txt')),
        parseCsvString(readGtfsFile('stops.txt')),
        parseCsvString(readGtfsFile('stop_times.txt')),
        parseCsvString(readGtfsFile('fare_attributes.txt')),
    ]);
    logger.info('Step 3: Process GTFS data');
    const stopsById = new Map<string, Record<string, string>>();
    for (const stop of stops) {
        const stopId = stop.stop_id;
        if (stopId) {
            stopsById.set(stopId, stop);
        }
    }

    const tripIdsByRouteId = new Map<string, string[]>();
    const tripIdsToProcess = new Array<string>();
    for (const trip of trips) {
        const routeId = trip.route_id;
        const tripId = normalizeTripId(trip.trip_id);
        const routeTripIds = tripIdsByRouteId.get(routeId) ?? [];
        if (!routeTripIds.includes(tripId)) {
            routeTripIds.push(tripId);
            tripIdsByRouteId.set(routeId, routeTripIds);
            tripIdsToProcess.push(trip.trip_id);
        }
    }

    const stopTimesByTripId = new Map<string, Array<{ stopId: string; sequence: number }>>();
    for (const stopTime of stopTimes) {
        if (!tripIdsToProcess.includes(stopTime.trip_id)) {
            continue;
        }
        const tripId = normalizeTripId(stopTime.trip_id);
        const records = stopTimesByTripId.get(tripId) ?? [];
        records.push({
            stopId: stopTime.stop_id,
            sequence: Number(stopTime.stop_sequence),
        });
        stopTimesByTripId.set(tripId, records);
    }

    const routeObjects: Route[] = [];
    for (const route of routes) {
        let company = normalizeCompanyCode(route.agency_id) ?? null;
        if (!company) {
            continue;
        }
        const description = route.agency_id.includes('+') ? 'joint' : 'normal';

        const tripIds = tripIdsByRouteId.get(route.route_id) ?? [];
        if (tripIds.length === 0) {
            continue;
        }

        const processedResult = GeneralUtil.gtfsSpecialHandling(company, route.route_short_name);
        company = processedResult.company;
        const routeNo = processedResult.route;

        for (const tripId of tripIds) {
            const stopList = stopTimesByTripId
                .get(tripId)
                .sort((a, b) => a.sequence - b.sequence)
                .map(({ stopId }) => {
                    const stopRow = stopsById.get(stopId);
                    return new Stop(
                        undefined,
                        normalizeStopName(stopRow.stop_name),
                        stopRow.stop_lat,
                        stopRow.stop_lon,
                        undefined,
                        undefined,
                        undefined,
                        stopId,
                    );
                });

            if (stopList.length === 0) {
                continue;
            }
            routeObjects.push(
                new Route(
                    company,
                    routeNo,
                    undefined,
                    undefined,
                    route.route_long_name,
                    undefined,
                    stopList,
                    undefined,
                    description,
                    tripId,
                ),
            );
        }
    }
    const fareData = createGtfsFareData(fareAttributes, trips, stopTimes);
    fs.writeFileSync(fareOutputPath, JSON.stringify(fareData));
    logger.info(`total fare groups: ${fareData.length}`);
    logger.info(`total routes: ${routeObjects.length}`);
    fs.writeFileSync(path.join(outputFolder, 'gtfs.json'), JSON.stringify(routeObjects));
    fs.writeFileSync(path.join(outputFolder, 'lastUpdate.txt'), csvDate);
    telegramPost(`GTFS updated: ${csvDate}`);
    core.exportVariable('gtfsUpdated', true);
    logger.info('End');
})();
