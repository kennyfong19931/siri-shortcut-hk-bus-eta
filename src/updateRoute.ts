import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import csv from 'csvtojson';

import { COMPANY, PLACEHOLDER } from "./constant";
import { Route } from "./class/Route";
import { Stop } from "./class/Stop";
import logger from "./utils/logger";

const outputFolder = path.join("api", "route");

const doRequest = async (method: string, url: string, body?: {}, toString = false) => {
    let result;
    while (true) {
        let request;
        if (method == "POST" && body != null) {
            request = fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });
        } else {
            request = fetch(url, { method: method });
        }

        await Promise.all([request])
            .then(([response]) => {
                if (!response.ok) {
                    throw new Error("HTTP status code: " + response.status);
                } else {
                    result = toString ? response.text() : response.json();
                }
            })
            .catch((err) => {
                logger.error(`Fail to call ${url} `, err.message);
            })

        if (result !== null && result !== undefined)
            return result;

        await new Promise(r => setTimeout(r, 60000));
    }
}

let ctbNwfbStopMap = new Map();
const getCtbNwfbStop = async (stop: string) => {
    if (ctbNwfbStopMap.has(stop)) {
        return ctbNwfbStopMap.get(stop);
    } else {
        let stopApi = COMPANY.CTB.STOP_API.replace(PLACEHOLDER.STOP, stop);
        return await doRequest("GET", stopApi)
            .then(stop => {
                if (stop == undefined) {
                    return undefined;
                } else {
                    let stopObj = new Stop(stop.data.stop, stop.data.name_tc, stop.data.lat, stop.data.long)
                    ctbNwfbStopMap.set(stop, stopObj);
                    return stopObj;
                }
            })
    }
};

const getRoute = async (companyCode: string) => {
    logger.info(`Step 1: Get route data, company: ${companyCode}`);
    try {
        const company = Object.values(COMPANY).find(c => c.CODE == companyCode);

        switch (company.CODE) {
            case COMPANY.KMB.CODE:
                {
                    const [routeList, stopList, routeStopList] = await Promise.all([
                        doRequest("GET", company.ROUTE_API),
                        doRequest("GET", company.STOP_API),
                        doRequest("GET", company.ROUTE_STOP_API)
                    ]);
                    return routeList.data.map((route) => {
                        return new Route(company.CODE, route.route, route.service_type, route.bound, route.orig_tc, route.dest_tc,
                            (routeStopList.data as any[]).filter(s => s.route == route.route && s.bound == route.bound && s.service_type == route.service_type)
                                .map(routeStop => {
                                    let stop = (stopList.data as any[]).find(s => s.stop == routeStop.stop);
                                    if (stop == undefined) {
                                        return undefined;
                                    } else {
                                        return new Stop(stop.stop, stop.name_tc, stop.lat, stop.long);
                                    }
                                })
                                .filter(s => s !== undefined),
                            undefined,
                            route.service_type == 0 ? "正常班次" : "特別班次"
                        );
                    })
                }
            case COMPANY.CTB.CODE:
            case COMPANY.NWFB.CODE:
                {
                    const routeApi = company.ROUTE_API.replace(PLACEHOLDER.COMPANY, company.CODE);
                    const [routeList] = await Promise.all([
                        doRequest("GET", routeApi)
                    ]);

                    let routeListWithBound = [];
                    for (const [key, value] of Object.entries({ inbound: "I", outbound: "O" })) {
                        routeList.data.forEach((route) => {
                            if (value == "I") {
                                routeListWithBound.push({
                                    dirParam: key,
                                    dir: value,
                                    route: route.route,
                                    orig: route.dest_tc,
                                    dest: route.orig_tc,
                                });
                            } else {
                                routeListWithBound.push({
                                    dirParam: key,
                                    dir: value,
                                    route: route.route,
                                    orig: route.orig_tc,
                                    dest: route.dest_tc,
                                });
                            }
                        })
                    }

                    let result = [];
                    for (const route of routeListWithBound) {
                        let routeStopApi = company.ROUTE_STOP_API.replace(PLACEHOLDER.COMPANY, company.CODE)
                            .replace(PLACEHOLDER.ROUTE, route.route)
                            .replace(PLACEHOLDER.DIRECTION, route.dirParam);
                        let response = await doRequest("GET", routeStopApi);

                        let stopPromiseList = response.data
                            .map((routeStop) => getCtbNwfbStop(routeStop.stop));

                        let stopList = await Promise.all(stopPromiseList)
                            .then((stopList) => stopList.filter(s => s !== undefined))
                        result.push(new Route(company.CODE, route.route, null, route.dir, route.orig, route.dest, stopList));
                    }
                    return result;
                }
            case COMPANY.NLB.CODE:
                {
                    const [routeList] = await Promise.all([
                        doRequest("POST", company.ROUTE_API)
                    ]);

                    let result = routeList.routes.map(async (route) => {
                        const routeDest = route.routeName_c.split(">");

                        const stopList = await doRequest("POST", company.ROUTE_STOP_API, { routeId: route.routeId })
                            .then((response) => response.stops.map((stop) => new Stop(stop.stopId, stop.stopName_c, stop.latitude, stop.longitude, stop.stopLocation_c, stop.fare, stop.fareHoliday)));

                        return new Route(company.CODE, route.routeNo, null, null, routeDest[0].trim(), routeDest[1].trim(), stopList, route.routeId);
                    });


                    return await Promise.all(result);
                }
            case COMPANY.GMB.CODE:
                {
                    const [allRouteList] = await Promise.all([
                        doRequest("GET", COMPANY.GMB.ALL_ROUTE_API)
                    ]);

                    let routeList = [];
                    for (const [regionCode, regionRouteList] of Object.entries(allRouteList.data.routes)) {
                        (regionRouteList as string[]).forEach((route) => {
                            let routeApi = company.ROUTE_API.replace(PLACEHOLDER.REGION, regionCode)
                                .replace(PLACEHOLDER.ROUTE, route);

                            routeList.push(doRequest("GET", routeApi));
                        })
                    }
                    let result = await Promise.all(routeList)
                        .then((routeResponse) =>
                            routeResponse.map((route) =>
                                route.data.map(async (routeObj) =>
                                    await Promise.all(routeObj.directions.map(async (dir) => {
                                        console.log(`routeObj.route_id: ${routeObj.route_id} `);
                                        const routeStopApi = company.ROUTE_STOP_API.replace(PLACEHOLDER.ROUTE, routeObj.route_id)
                                            .replace(PLACEHOLDER.ROUTE_TYPE, dir.route_seq);
                                        const stopList = await Promise.all(await doRequest("GET", routeStopApi)
                                            .then((response) => response.data.route_stops.map(async (stop) => {
                                                const stopApi = company.STOP_API.replace(PLACEHOLDER.STOP, stop.stop_id);
                                                const stopDetail = await doRequest("GET", stopApi)
                                                    .then((response) => response.data);

                                                return new Stop(stop.stop_seq, stop.name_tc, stopDetail.coordinates.wgs84.latitude, stopDetail.coordinates.wgs84.latitude);
                                            })));
                                        return new Route(company.CODE, routeObj.route_code, dir.route_seq, undefined, dir.orig_tc, dir.dest_tc, stopList, routeObj.route_id, routeObj.description_tc);
                                    }))
                                )
                            )
                                .flat(1)
                        );
                    return await Promise.all(result)
                        .then((result) => result.flat(1));
                }
            case COMPANY.MTR.CODE:
                {
                    const [routeList, stopList] = await Promise.all([
                        doRequest("GET", company.ROUTE_API, null, true),
                        doRequest("GET", company.ROUTE_STOP_API, null, true)
                    ]).then(async ([routeList, stopList]) => await Promise.all([
                        csv().fromString(routeList),
                        csv().fromString(stopList)
                    ]));

                    return routeList.filter((route) => route.ROUTE_ID != "")
                        .map((route) => {
                            let routeStop = stopList.filter((stop) => stop.ROUTE_ID == route.ROUTE_ID);
                            return ["O", "I"].map((dir) => {
                                let stopList = routeStop.filter((stop) => stop.DIRECTION == dir)
                                    .map((stop) => new Stop(stop.STATION_ID, stop.STATION_NAME_CHI, stop.STATION_LATITUDE, stop.STATION_LONGITUDE));
                                if (stopList.length == 0)
                                    return null;
                                else
                                    return new Route(company.CODE, route.ROUTE_ID, null, dir, stopList.at(0).getName(), stopList.at(-1).getName(), stopList);
                            })
                                .filter((result) => result != null);
                        })
                        .flat(1);

                }
        }
    } catch (err) {
        logger.error(`[getRoute]`, err);
    }
};

const addToMap = (map: Map<string, Array<Route>>, routeList: Array<Route>) => {
    routeList.forEach((route: Route) => {
        let value = map.has(route.getRoute()) ? map.get(route.getRoute()) : [];
        value.push(route);
        map.set(route.getRoute(), value);
    })
}

(async function () {
    logger.info("Start");
    await Promise.all([
        getRoute(COMPANY.KMB.CODE),
        getRoute(COMPANY.CTB.CODE),
        getRoute(COMPANY.NWFB.CODE),
        getRoute(COMPANY.NLB.CODE),
        getRoute(COMPANY.GMB.CODE),
        getRoute(COMPANY.MTR.CODE),
    ]).then(([kmb, ctb, nwfb, nlb, gmb, mtr]) => {
        logger.info(`Step 2: Merge by route`);
        const routeMap = new Map();
        addToMap(routeMap, kmb);
        addToMap(routeMap, ctb);
        addToMap(routeMap, nwfb);
        addToMap(routeMap, nlb);
        addToMap(routeMap, gmb);
        addToMap(routeMap, mtr);
        logger.info(`route count: ${routeMap.size}`);

        logger.info(`Step 3: Save result to JSON file`);
        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder);
        } else {
            fs.readdir(outputFolder, (err, files) => {
                if (err) throw err;

                for (const file of files) {
                    fs.unlink(path.join(outputFolder, file), err => {
                        if (err) throw err;
                    });
                }
            });
        }
        routeMap.forEach((value, key) => {
            let filename = path.join(outputFolder, key + ".json");
            let data = JSON.stringify(value);
            fs.writeFile(filename, data, (err) => {
                if (err)
                    logger.error(`error when save file ${filename}`, err);
            });
        });
    });
    logger.info("End");
})();