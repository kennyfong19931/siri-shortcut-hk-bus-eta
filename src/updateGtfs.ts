import { readFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { COMPANY } from './constant';
import { Route } from './class/Route';
import { Stop } from './class/Stop';
import logger from './utils/logger';
import { parseCsvString } from './utils/csvUtil';
import { doRequest } from './utils/requestUtil';

const outputFolder = path.join('gtfs');
const LAST_UPDATE_URL = 'https://static.data.gov.hk/td/pt-headway-en/DATA_LAST_UPDATED_DATE.csv';
const ROUTES_URL = 'https://static.data.gov.hk/td/pt-headway-tc/routes.txt';
const STOPS_URL = 'https://static.data.gov.hk/td/pt-headway-tc/stops.txt';
const STOP_TIMES_URL = 'https://static.data.gov.hk/td/pt-headway-tc/stop_times.txt';
const TRIPS_URL = 'https://static.data.gov.hk/td/pt-headway-tc/trips.txt';

function normalizeCompanyCode(companyCode?: string): string | null {
    switch ((companyCode ?? '').trim().toUpperCase()) {
        case 'KMB':
        case 'KMB+CTB':
        case 'LWB+CTB':
            return COMPANY.KMB.CODE;
        case 'CTB':
            return COMPANY.CTB.CODE;
        case 'NLB':
            return COMPANY.NLB.CODE;
        case 'GMB':
            return COMPANY.GMB.CODE;
        case 'LRTFeeder':
            return COMPANY.MTR.CODE;
        case 'PI':
            return companyCode;
        default:
            return null;
    }
}

function normalizeStopName(rawStopName?: string): string {
    let tempStopName = rawStopName;
    if (rawStopName.includes('+')) {
        let stopNameList = rawStopName.split('|');
        for (const stopName of stopNameList) {
            if (stopName.includes('+')) {
                tempStopName = stopName.replace('<BR>', '');
            }
        }
    } else if (rawStopName.includes('|')) {
        let stopNameList = rawStopName.split('|');
        if (rawStopName.includes('KMB')) {
            for (const stopName of stopNameList) {
                if (rawStopName.includes('KMB') && stopName.includes('KMB')) {
                    tempStopName = stopName.replace('<BR>', '');
                }
            }
        } else {
            tempStopName = stopNameList[0];
        }
    }
    return tempStopName.substring(tempStopName.indexOf(']') + 1).trim();
}

function normalizeTripId(tripId?: string): string {
    // The trip_id is composed of: (1) route id; (2) route bound; (3) service id; (4) departure time
    if (!tripId) return '';
    const parts = tripId.split('-');
    return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : tripId;
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
    const csvContent = await doRequest('GET', LAST_UPDATE_URL, undefined, undefined, undefined, true);
    const regex = /\b(\d{4}-\d{2}-\d{2})\b/;
    const m = csvContent.match(regex);
    const csvDate = m[1];
    if (lastUpdate === csvDate) {
        logger.info(`lastUpdate: ${lastUpdate}, csvDate: ${csvDate}, No update needed`);
    } else {
        runUpdate = true;
        fs.writeFileSync(path.join(outputFolder, 'lastUpdate.txt'), csvDate);
    }
    if (!runUpdate) {
        logger.info('End');
        return;
    }

    logger.info('Step 2: Download GTFS data');
    await Promise.all([
        doRequest('GET', ROUTES_URL, undefined, undefined, undefined, true),
        doRequest('GET', TRIPS_URL, undefined, undefined, undefined, true),
        doRequest('GET', STOPS_URL, undefined, undefined, undefined, true),
        doRequest('GET', STOP_TIMES_URL, undefined, undefined, undefined, true),
        // readFile(path.join(outputFolder, 'routes.txt'), 'utf8'),
        // readFile(path.join(outputFolder, 'trips.txt'), 'utf8'),
        // readFile(path.join(outputFolder, 'stops.txt'), 'utf8'),
        // readFile(path.join(outputFolder, 'stop_times.txt'), 'utf8'),
    ])
        .then(
            async ([routesCsv, tripsCsv, stopsCsv, stopTimesCsv]) =>
                await Promise.all([
                    parseCsvString(routesCsv),
                    parseCsvString(tripsCsv),
                    parseCsvString(stopsCsv),
                    parseCsvString(stopTimesCsv),
                ]),
        )
        .then(([routes, trips, stops, stopTimes]) => {
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

                let routeNo = route.route_short_name;
                // special handling start
                // for MTR bus run by KMB
                if (company === COMPANY.KMB.CODE && ['K12', 'K14', 'K17', 'K18'].includes(routeNo)) {
                    company = COMPANY.MTR.CODE;
                }
                // for KMB 331,331R
                if (company === 'PI' && ['NR331', 'NR331S'].includes(routeNo)) {
                    company = COMPANY.KMB.CODE;
                    if (routeNo === 'NR331') {
                        routeNo = '331';
                    } else if (routeNo === 'NR331S') {
                        routeNo = '331S';
                    }
                }
                // for CTB 61R,88R, route number is different from TD
                if (company === COMPANY.CTB.CODE && ['NR61', 'NR88'].includes(routeNo)) {
                    if (routeNo === 'NR61') {
                        routeNo = '61R';
                    } else if (routeNo === 'NR88') {
                        routeNo = '88R';
                    }
                }
                // special handling end

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
            logger.info(`total routes: ${routeObjects.length}`);
            fs.writeFileSync(path.join(outputFolder, 'gtfs.json'), JSON.stringify(routeObjects));
        });
    logger.info('End');
})();
