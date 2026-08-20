import { COMPANY, PLACEHOLDER } from './constant';
import logger from './utils/logger';
import CacheUtil from './utils/cacheUtil';
import { doRequest } from './utils/requestUtil';

const timeout = 50;

const updateStopNameCache = async (companyCode: string) => {
    logger.info(`Start update stop name cache, company: ${companyCode}`);
    try {
        const company = Object.values(COMPANY).find((c) => c.CODE == companyCode);

        switch (company.CODE) {
            case COMPANY.CTB.CODE:
            case COMPANY.NWFB.CODE: {
                const routeApi = company.ROUTE_API.replace(PLACEHOLDER.COMPANY, company.CODE);
                const [routeList] = await Promise.all([doRequest('GET', routeApi)]);

                let routeListWithBound = [];
                for (const [key, value] of Object.entries({
                    inbound: 'I',
                    outbound: 'O',
                })) {
                    routeList.data.forEach((route) => {
                        if (value == 'I') {
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
                    });
                }

                for (const route of routeListWithBound) {
                    let routeStopApi = company.ROUTE_STOP_API.replace(PLACEHOLDER.COMPANY, company.CODE)
                        .replace(PLACEHOLDER.ROUTE, route.route)
                        .replace(PLACEHOLDER.DIRECTION, route.dirParam);
                    let response = await doRequest('GET', routeStopApi);

                    if (response.data.length > 0) {
                        for (const routeStop of response.data) {
                            let stopApi = COMPANY.CTB.STOP_API.replace(PLACEHOLDER.STOP, routeStop.stop);
                            await doRequest('GET', stopApi).then((stop) => {
                                if (stop != undefined) {
                                    CacheUtil.setCache(`${company.CODE}_stop_${routeStop.stop}`, stop.data);
                                }
                            });
                            await new Promise((resolve) => setTimeout(resolve, timeout));
                        }
                    }
                }
            }
            case COMPANY.GMB.CODE: {
                const stopLastUpdateDate = await doRequest('GET', COMPANY.GMB.STOP_LAST_UPDATE_API).then(
                    (response) => response.data,
                );
                for (const i of stopLastUpdateDate) {
                    const cacheKey = `${company.CODE}_stop_${i.stop_id}`;
                    const cacheLastUpdateDate = CacheUtil.getCache(`${cacheKey}`)?.data_timestamp;
                    const lastUpdateDate = i.last_update_date.replace('+00:00', '+08:00');
                    if (
                        lastUpdateDate == null ||
                        cacheLastUpdateDate == null ||
                        new Date(cacheLastUpdateDate) > new Date(lastUpdateDate)
                    ) {
                        continue;
                    }
                    const stopApi = company.STOP_API.replace(PLACEHOLDER.STOP, i.stop_id);
                    let json = await doRequest('GET', stopApi).then((response) => response.data);
                    CacheUtil.setCache(cacheKey, json);
                    await new Promise((resolve) => setTimeout(resolve, timeout));
                }
            }
        }
    } catch (err) {
        logger.error(`[updateStopNameCache]`, err);
    }
    logger.info(`End update stop name cache, company: ${companyCode}`);
};

(async function () {
    logger.info('Start');
    await Promise.all([updateStopNameCache(COMPANY.CTB.CODE), updateStopNameCache(COMPANY.GMB.CODE)]);
    logger.info('End');
})();
