import fetch from "node-fetch";

import { COMPANY, PLACEHOLDER } from "./constant";
import logger from "./utils/logger";
import CacheUtil from "./utils/cacheUtil";

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

        await new Promise(r => setTimeout(r, 300000));
    }
}

const updateStopNameCache = async (companyCode: string) => {
    logger.info(`Start update stop name cache, company: ${companyCode}`);
    try {
        const company = Object.values(COMPANY).find(c => c.CODE == companyCode);

        switch (company.CODE) {
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

                    for (const route of routeListWithBound) {
                        let routeStopApi = company.ROUTE_STOP_API.replace(PLACEHOLDER.COMPANY, company.CODE)
                            .replace(PLACEHOLDER.ROUTE, route.route)
                            .replace(PLACEHOLDER.DIRECTION, route.dirParam);
                        let response = await doRequest("GET", routeStopApi);

                        if (response.data.length > 0) {
                            response.data.forEach(async (routeStop) => {
                                let stopApi = COMPANY.CTB.STOP_API.replace(PLACEHOLDER.STOP, routeStop.stop);
                                await doRequest("GET", stopApi)
                                    .then(stop => {
                                        if (stop != undefined) {
                                            CacheUtil.setCache(`${company.CODE}_stop_${routeStop.stop}`, stop.data);
                                        }
                                    });
                            });
                        }
                    }
                }
            case COMPANY.GMB.CODE:
                {
                    const stopLastUpdateDate = await doRequest("GET", COMPANY.GMB.STOP_LAST_UPDATE_API).then((response) => response.data);
                    stopLastUpdateDate.filter((i) => new Date(i.last_update_date) > new Date())
                        .forEach(async (i) => {
                            const stopApi = company.STOP_API.replace(PLACEHOLDER.STOP, i.stop_id);
                            let json = await doRequest("GET", stopApi).then((response) => response.data);
                            CacheUtil.setCache(`${company.CODE}_stop_${i.stop_id}`, json);
                        });
                }
        }
    } catch (err) {
        logger.error(`[updateStopNameCache]`, err);
    }
    logger.info(`End update stop name cache, company: ${companyCode}`);
};

(async function () {
    logger.info("Start");
    await Promise.all([
        updateStopNameCache(COMPANY.CTB.CODE),
        updateStopNameCache(COMPANY.GMB.CODE),
    ])
    logger.info("End");
})();
