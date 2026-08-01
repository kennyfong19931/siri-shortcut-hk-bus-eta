import { readFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { COMPANY } from './constant';
import { JointRoute } from './class/JointRoute';
import { Route } from './class/Route';
import { Stop } from './class/Stop';
import logger from './utils/logger';
import SpatialUtil from './utils/spatialUtil';

const outputFolder = path.join('public', 'api', 'route');
const gtfsFile = path.join('gtfs', 'gtfs.json');

const debugRoute = '';
const debugStop = '';
const DISTANCE_THRESHOLD_ROUTE = 70;
const DISTANCE_THRESHOLD_STOP = 150;
const DISTANCE_THRESHOLD_STOP_SPECIAL = new Map<string, number>([
    ['隧道', 200],
    ['轉車站', 200],
    ['口岸', 1000],
    ['南山三屋村', 190], // added for NLB 1
    ['秀雅道遊樂場 (KT532)', 175], // added for KMB 13
    ['石崗菜站 (YL726)', 160], // added for KMB 251B
    ['灰沙圍 (YL353)', 160], // added for KMB 268B
    ['深水埗(欽州街) (SS971)', 160], // added for KMB 270D
    ['如心廣場巴士總站 (TW954)', 200], // added for KMB 278P
    ['深水埗欽州街 (SS486)', 200], // added for KMB 286D
    ['逸東邨福逸樓', 160], // added for NLB 37
    ['東環', 190], // added for NLB 37M
]);
const GTFS_MERGE_ROUTE_BLACKLIST = [
    { company: COMPANY.CTB.CODE, route: '1', keyword: ['不經'] },
    { company: COMPANY.NLB.CODE, route: '1', keyword: ['經'] },
    { company: COMPANY.CTB.CODE, route: '10', keyword: ['不經'] },
    { company: COMPANY.CTB.CODE, route: '101X', keyword: ['經'] },
    { company: COMPANY.CTB.CODE, route: '11', keyword: ['不經'] },
    { company: COMPANY.NLB.CODE, route: '11', keyword: ['經', '懲教所', '水口'] },
    { company: COMPANY.CTB.CODE, route: '110', keyword: ['經'] },
    { company: COMPANY.CTB.CODE, route: '25', keyword: ['經'] },
    { company: COMPANY.CTB.CODE, route: '4', keyword: ['假期', '田灣', '經'] },
];
const RETURN_FIRST_STOP_MATCH = [
    { company: COMPANY.CTB.CODE, route: '14', stop: '聖士提反書院, 東頭灣道' },
    { company: COMPANY.CTB.CODE, route: '260', stop: '聖士提反書院, 東頭灣道' },
    { company: COMPANY.KMB.CODE, stop: '城門隧道轉車站 (B6) (TW300)' },
    { company: COMPANY.KMB.CODE, route: '269B', stop: '天晴邨晴雲樓 (TN252)' },
    { company: COMPANY.KMB.CODE, route: '69C', stop: '天晴邨晴雲樓 (TN252)' },
    { company: COMPANY.KMB.CODE, route: '273S', stop: '粉嶺站轉車站-蓬瀛仙館 (ND398)' },
    { company: COMPANY.KMB.CODE, route: '297', stop: '新都城二期 (TK925)' },
    { company: COMPANY.KMB.CODE, route: '30', stop: '下葵涌分科診所 (KW300)' },
    { company: COMPANY.KMB.CODE, route: '35A', stop: '石排街石歡樓 (KW209)' },
    { company: COMPANY.KMB.CODE, route: '35X', stop: '石排街石歡樓 (KW209)' },
    { company: COMPANY.NLB.CODE, route: '37', stop: '滿東邨' },
    { company: COMPANY.KMB.CODE, route: '40B', stop: '下葵涌分科診所 (KW300)' },
    { company: COMPANY.CTB.CODE, route: '6', stop: '聖士提反書院, 東頭灣道' },
    { company: COMPANY.CTB.CODE, route: '6X', stop: '聖士提反書院, 東頭灣道' },
    { company: COMPANY.KMB.CODE, route: '91M', stop: '新都城二期 (TK925)' },
    { company: COMPANY.KMB.CODE, route: '93A', stop: '新都城二期 (TK925)' },
    { company: COMPANY.KMB.CODE, route: '93K', stop: '新都城二期 (TK925)' },
    { company: COMPANY.KMB.CODE, route: '93P', stop: '新都城二期 (TK925)' },
];
const MATCH_ROUTE_OVERRIDE = [
    { company: COMPANY.CTB.CODE, route: '4', count: 6 },
];

async function loadRoute(filePath: string): Promise<Route[]> {
    try {
        const rawData = await readFile(filePath, 'utf8');
        return JSON.parse(rawData).map((route: Route) => {
            Object.setPrototypeOf(route, Route.prototype);
            route.getStopList().map((stop: Stop) => {
                Object.setPrototypeOf(stop, Stop.prototype);
                return stop;
            });
            return route;
        });
    } catch (error) {
        logger.error('[loadRoute]', error);
    }
}

function stopMatch(stopA: Stop, stopB: Stop, threshold = DISTANCE_THRESHOLD_ROUTE): boolean {
    return SpatialUtil.haversine(stopA, stopB) <= threshold;
}

function edgeStops(stopList: Array<Stop>, count: number = 2) {
    if (stopList.length < 4) {
        count = 1;
    }
    return {
        first: stopList.slice(0, count),
        last: stopList.slice(-count),
    };
}

function matchRoute(a: Route, b: Route, partialMatch: boolean): boolean {
    if (a === b) return false;
    if (a.getRoute() !== b.getRoute()) return false;

    // get the leading and trailing stops for comparison
    // in case the stopList is missing a terminus
    // or the terminus locations of the two companies are too far away

    const aOverride = MATCH_ROUTE_OVERRIDE.find(
        (config) => config.company === a.getCompany() && config.route === a.getRoute(),
    );
    const bOverride = MATCH_ROUTE_OVERRIDE.find(
        (config) => config.company === b.getCompany() && config.route === b.getRoute(),
    );
    const aStops = edgeStops(a.getStopList(), aOverride?.count);
    const bStops = edgeStops(b.getStopList(), bOverride?.count);

    const firstMatch = aStops.first.some((aStop) => bStops.first.some((bStop) => stopMatch(aStop, bStop)));
    const lastMatch = aStops.last.some((aStop) => bStops.last.some((bStop) => stopMatch(aStop, bStop)));

    if (partialMatch === true) {
        // retunr true if any terminus match
        return firstMatch || lastMatch;
    } else {
        return firstMatch && lastMatch;
    }
}

function getBestMatchedStopIndex(
    stop: Stop,
    stopList: Array<Stop>,
    ignoreIndex: Set<number>,
    futureStops: Array<Stop> = [],
    returnFirstMatch: boolean = false,
    debug: boolean = false,
) {
    const selectBestIndex = (
        candidates: Array<{ index: number; dist: number }>,
        returnFirstMatch: boolean,
        debug: boolean,
    ) => {
        let bestIndex = -1;
        let bestDist = Infinity;

        if (returnFirstMatch) {
            return candidates[0]?.index ?? bestIndex;
        }

        candidates.forEach(({ index, dist }) => {
            const futureBestDist = futureStops.reduce((best, futureStop) => {
                const d = SpatialUtil.haversine(futureStop, stopList[index]);
                if (debug) logger.debug(`futureStop ${futureStop.getName()} ${d}`);
                return Math.min(best, d);
            }, Infinity);

            if (futureBestDist < dist) {
                if (debug) logger.debug(`futureBestDist ${futureBestDist} < dist ${dist}`);
                return;
            }

            if (dist < bestDist) {
                bestDist = dist;
                bestIndex = index;
            }
        });

        return bestIndex;
    };

    const normalCandidates = stopList.flatMap((stopB, index) => {
        if (ignoreIndex.has(index)) return [];
        const d = SpatialUtil.haversine(stop, stopB);
        if (debug) {
            logger.debug(
                `stop ${stop.getName()} ${stop.getLat()}, ${stop.getLong()} | stopB(${index}) ${stopB.getName()} ${stopB.getLat()}, ${stopB.getLong()} | dist: ${d}`,
            );
        }
        return d <= DISTANCE_THRESHOLD_STOP ? [{ index, dist: d }] : [];
    });

    const normalBestIndex = selectBestIndex(normalCandidates, returnFirstMatch, debug);
    if (normalBestIndex >= 0) return normalBestIndex;

    // If the stop name contains any special keywords, try the per-keyword thresholds.
    const specialCandidates = Array.from(DISTANCE_THRESHOLD_STOP_SPECIAL.entries()).flatMap(([name, threshold]) => {
        if (!stop.getName().includes(name)) return [];
        return stopList.flatMap((stopB, index) => {
            if (ignoreIndex.has(index)) return [];
            const d = SpatialUtil.haversine(stop, stopB);
            return d <= threshold ? [{ index, dist: d }] : [];
        });
    });

    return selectBestIndex(specialCandidates, returnFirstMatch, debug);
}

function scoreRouteMatch(route: Route, candidate: Route): number {
    const matchedStops = new Set<number>();

    return route.getStopList().reduce((score, stop) => {
        const index = getBestMatchedStopIndex(stop, candidate.getStopList(), matchedStops);
        if (index >= 0) {
            matchedStops.add(index);
            return score + 1;
        }
        return score;
    }, 0);
}

function createVirtualCircularRoute(routeA: Route, routeB: Route) {
    const stopList: Stop[] = [];
    const seenStopIds = new Set<string>();

    const appendStop = (stop: Stop, dir: string) => {
        if (seenStopIds.has(stop.getId())) {
            return;
        }
        stop.setCtbDir(dir);
        stopList.push(stop);
        seenStopIds.add(stop.getId());
    };

    routeA.getStopList().forEach((stop) => {
        appendStop(stop, routeA.getDir());
    });
    routeB.getStopList().forEach((stop) => {
        appendStop(stop, routeB.getDir());
    });

    return new Route(
        routeA.getCompany(),
        routeA.getRoute(),
        routeA.getRouteType(),
        routeA.getDir() + routeB.getDir(),
        routeA.getOrig(),
        routeA.getDest(),
        stopList,
        routeA.getRouteId(),
    );
}

(async function () {
    logger.info('Start');
    logger.info('Step 1: Get GTFS data');
    const gtfs = fs.existsSync(gtfsFile) ? await loadRoute(gtfsFile) : null;
    if (gtfs === null) {
        throw new Error('gtfs data not found.');
    }
    const fileList = fs.readdirSync(outputFolder);
    logger.info(`Step 2: Load route list, count: ${fileList.length}`);
    const jointRouteMap: Map<string, Array<JointRoute>> = new Map<string, Array<JointRoute>>();
    logger.info('Step 3: Merge route data');
    for (const file of fileList) {
        const currentRoute = file.split('.')[0];
        if (debugRoute !== '' && currentRoute !== debugRoute) {
            continue;
        }

        const json = await loadRoute(path.join(outputFolder, file));
        const createVirtualCtbCircularRoute =
            gtfs.filter(
                (gtfs: Route) =>
                    gtfs.getRoute() === currentRoute &&
                    (gtfs.getCompany() === COMPANY.CTB.CODE ||
                        (gtfs.getCompany() === COMPANY.KMB.CODE && gtfs.getDescription() === 'joint')) &&
                    gtfs.getOrig().includes('循環線'),
            ).length > 0 && json.filter((route) => route.getCompany() === COMPANY.CTB.CODE).length === 2;

        if (createVirtualCtbCircularRoute) {
            // create virtual route if CTB data split into 2 direction
            const ctbO = json.filter((route) => route.getCompany() === COMPANY.CTB.CODE && route.getDir() === 'O')[0];
            const ctbI = json.filter((route) => route.getCompany() === COMPANY.CTB.CODE && route.getDir() === 'I')[0];
            json.push(createVirtualCircularRoute(ctbO, ctbI));
            // json.push(createCircularRoute(ctbI, ctbO));
        }

        // merge gtfsId
        const routes = json
            .filter(
                (route: Route) =>
                    route.getCompany() !== COMPANY.CTB.CODE ||
                    (createVirtualCtbCircularRoute &&
                        route.getCompany() === COMPANY.CTB.CODE &&
                        !['I', 'O'].includes(route.getDir())) ||
                    !createVirtualCtbCircularRoute,
            )
            .map((route: Route) => {
                const isCircular =
                    route.getRoute() !== '14' &&
                    gtfs.filter(
                        (gtfs: Route) => gtfs.getRoute() === route.getRoute() && gtfs.getOrig().includes('循環線'),
                    ).length > 0;
                const gtfsRouteList = gtfs.filter((gtfs: Route) => matchRoute(gtfs, route, false));
                let matchedRoute: Route | undefined = gtfsRouteList[0];
                if (gtfsRouteList.length > 1) {
                    matchedRoute = gtfsRouteList.reduce((bestRoute: Route | undefined, candidate: Route) => {
                        if (
                            GTFS_MERGE_ROUTE_BLACKLIST.some(
                                (b) =>
                                    b.company === route.getCompany() &&
                                    b.route === route.getRoute() &&
                                    b.keyword.some((k) => candidate.getOrig().includes(k)),
                            )
                        ) {
                            // use normal route
                            return bestRoute;
                        }

                        if (!bestRoute) return candidate;

                        const bestScore = scoreRouteMatch(route, bestRoute);
                        const candidateScore = scoreRouteMatch(route, candidate);

                        return candidateScore > bestScore ? candidate : bestRoute;
                    }, undefined);
                }
                if (matchedRoute) {
                    let fullStopList = [].concat(matchedRoute.getStopList());
                    gtfs.filter(
                        (gtfs: Route) => matchRoute(gtfs, route, true) && gtfs.getGtfsId() !== matchedRoute.getGtfsId(),
                    ).forEach((route: Route) => {
                        route.getStopList().forEach((stop) => {
                            const stopExist = matchedRoute.getStopList().some((stopB) => {
                                if (stopB.getGtfsId() === stop.getGtfsId()) return true;
                            });
                            if (!stopExist) fullStopList.push(stop);
                        });
                    });
                    const matchedStops = new Set<number>();
                    route.setGtfsId(matchedRoute.getGtfsId());
                    route.setStopList(
                        route.getStopList().map((stop: Stop, index: number) => {
                            const debug = stop.getName() === debugStop;
                            if (debug)
                                logger.debug(
                                    `stopCount: ${matchedRoute.getStopList().length} fullStopListCount: ${fullStopList.length}`,
                                );
                            const returnFirstMatch =
                                isCircular ||
                                RETURN_FIRST_STOP_MATCH.some(
                                    (item) =>
                                        item.company === route.getCompany() &&
                                        ((item.route && item.route === route.getRoute()) || !item.route) &&
                                        item.stop === stop.getName(),
                                );
                            const futureStops = route.getStopList().slice(index + 1);
                            const matchedIndex = getBestMatchedStopIndex(
                                stop,
                                matchedRoute.getStopList(),
                                matchedStops,
                                futureStops,
                                returnFirstMatch,
                                debug,
                            );
                            if (debug) logger.debug(`${stop.getName()} matchedIndex: ${matchedIndex}`);
                            if (matchedIndex >= 0) {
                                matchedStops.add(matchedIndex);
                                stop.setGtfsId(matchedRoute.getStopList().at(matchedIndex).getGtfsId());
                            } else {
                                // match with stop on special route
                                const matchedIndex2 = getBestMatchedStopIndex(
                                    stop,
                                    fullStopList,
                                    matchedStops,
                                    futureStops,
                                    returnFirstMatch,
                                    debug,
                                );
                                if (debug) logger.debug(`${stop.getName()} matchedIndex2: ${matchedIndex2}`);
                                if (matchedIndex2 >= 0) {
                                    matchedStops.add(matchedIndex2);
                                    stop.setGtfsId(fullStopList.at(matchedIndex2).getGtfsId());
                                } else {
                                    logger.warn(
                                        `[${route.getCompany()}|${route.getRoute()}|${route.getGtfsId()}] Failed to match stop: ${stop.getName()}`,
                                    );
                                }
                            }
                            return stop;
                        }),
                    );
                } else {
                    logger.warn(`Failed to match route ${route.getOrig()} - ${route.getDest()}`);
                }
                return route;
            });

        // Cleanup jsonWithGtfs, remove gtfsId if duplicate
        const gtfsGroup = routes.reduce((map: Map<string, Route[]>, r: Route) => {
            const id = r.getGtfsId();
            if (!id) return map;
            const arr = map.get(id) || [];
            arr.push(r);
            map.set(id, arr);
            return map;
        }, new Map<string, Route[]>());

        gtfsGroup.forEach((routes) => {
            if (routes.length <= 1) return;

            // Only resolve duplicates when routes share the same company and route value.
            const subgroupMap = routes.reduce((m: Map<string, Route[]>, r: Route) => {
                const key = `${r.getCompany()}|${r.getRoute()}`;
                const arr = m.get(key) || [];
                arr.push(r);
                m.set(key, arr);
                return m;
            }, new Map<string, Route[]>());

            subgroupMap.forEach((subRoutes) => {
                if (subRoutes.length <= 1) return;

                const counts = subRoutes.map((r) => r.getStopList().filter((s: Stop) => !!s.getGtfsId()).length);
                const max = Math.max(...counts);
                const keepIndex = counts.indexOf(max);

                subRoutes.forEach((r, idx) => {
                    if (idx === keepIndex) return;
                    r.setGtfsId(undefined);
                    r.setStopList(
                        r.getStopList().map((s: Stop) => {
                            s.setGtfsId(undefined);
                            return s;
                        }),
                    );
                });
            });
        });

        // merge joint company route
        const jointCompanyRoute = routes
            .map((route: Route) => {
                // only match kmb with ctb, since only kmb provide special route
                if (route.getCompany() !== COMPANY.KMB.CODE) return;

                const matches = json.filter((r: Route) =>
                    route.getCompany() === r.getCompany() ? false : matchRoute(route, r, false),
                );

                if (matches.length > 0) {
                    const matchedRoute = matches[0];
                    const matchedStops = new Set<number>();
                    const stopList = route
                        .getStopList()
                        .map((stop: Stop, index: number) => {
                            const futureStops = route.getStopList().slice(index + 1);
                            let matchedIndex = -1;

                            const gtfsId = stop.getGtfsId();
                            if (gtfsId) {
                                matchedIndex = matchedRoute
                                    .getStopList()
                                    .findIndex(
                                        (candidate, idx) => candidate.getGtfsId() === gtfsId && !matchedStops.has(idx),
                                    );
                            }

                            if (matchedIndex < 0) {
                                matchedIndex = getBestMatchedStopIndex(
                                    stop,
                                    matchedRoute.getStopList(),
                                    matchedStops,
                                    futureStops,
                                );
                            }

                            if (matchedIndex >= 0) {
                                matchedStops.add(matchedIndex);
                                return {
                                    gtfsId: stop.getGtfsId() || matchedRoute.getStopList().at(matchedIndex).getGtfsId(),
                                    kmb: stop.getId(),
                                    ctb: matchedRoute.getStopList().at(matchedIndex).getId(),
                                    ctbDir: matchedRoute.getStopList().at(matchedIndex).getCtbDir(),
                                };
                            }

                            return;
                        })
                        .filter((s) => s !== undefined);
                    return new JointRoute(
                        { routeId: route.getRouteId(), serviceType: route.getRouteType(), dir: route.getDir() },
                        {
                            routeId: matchedRoute.getRouteId(),
                            serviceType: matchedRoute.getRouteType(),
                            dir: matchedRoute.getDir(),
                        },
                        stopList,
                        route.getGtfsId(),
                    );
                } else {
                    return;
                }
            })
            .filter((matches) => matches !== undefined);

        if (jointCompanyRoute.length > 0) {
            jointRouteMap.set(routes[0].getRoute(), jointCompanyRoute);
        }

        const finalRoutes = routes.filter((route: Route) => {
            if (route.getCompany() !== COMPANY.CTB.CODE) return true;
            return !['IO', 'OI'].includes(route.getDir());
        });

        if (createVirtualCtbCircularRoute) {
            const virtualRoute = routes.find(
                (route: Route) =>
                    route.getCompany() === COMPANY.CTB.CODE &&
                    ['IO', 'OI'].includes(route.getDir()) &&
                    !!route.getGtfsId(),
            );

            if (virtualRoute) {
                json.filter(
                    (route: Route) => route.getCompany() === COMPANY.CTB.CODE && ['I', 'O'].includes(route.getDir()),
                ).forEach((route: Route) => {
                    route.setGtfsId(virtualRoute.getGtfsId());

                    route.setStopList(
                        route.getStopList().map((stop: Stop) => {
                            const matchedStop = virtualRoute
                                .getStopList()
                                .find(
                                    (virtualStop: Stop) =>
                                        virtualStop.getId() === stop.getId() && !!virtualStop.getGtfsId(),
                                );
                            if (!stop.getGtfsId() && matchedStop?.getGtfsId()) {
                                stop.setGtfsId(matchedStop.getGtfsId());
                            }
                            stop.setCtbDir(undefined);
                            return stop;
                        }),
                    );

                    finalRoutes.push(route);
                });
            }
        }

        finalRoutes.sort((a: Route, b: Route) => {
            const companyOrder = [
                COMPANY.KMB.CODE,
                COMPANY.CTB.CODE,
                COMPANY.NLB.CODE,
                COMPANY.GMB.CODE,
                COMPANY.MTR.CODE,
                COMPANY.MTR_LR.CODE,
            ];
            const aIndex = companyOrder.indexOf(a.getCompany());
            const bIndex = companyOrder.indexOf(b.getCompany());
            const normalizedA = aIndex >= 0 ? aIndex : companyOrder.length;
            const normalizedB = bIndex >= 0 ? bIndex : companyOrder.length;
            return normalizedA - normalizedB;
        });

        fs.writeFileSync(path.join(outputFolder, file), JSON.stringify(finalRoutes));
    }

    logger.info('Step 4: Save joint route, count: ' + jointRouteMap.size);
    const jointRouteJson = Object.fromEntries(jointRouteMap.entries());
    fs.writeFileSync(path.join('public', 'api', 'joint.json'), JSON.stringify(jointRouteJson));
})();
