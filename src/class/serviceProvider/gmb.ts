import * as core from '@actions/core';
import { doRequest } from '../../utils/requestUtil';
import { Route } from '../Route';
import { Stop } from '../Stop';
import { COMPANY, PLACEHOLDER } from '../../constant';
import CacheUtil from '../../utils/cacheUtil';

const company = COMPANY.GMB;

export async function crawlRoute(): Promise<Route[]> {
    const [allRouteList] = await Promise.all([doRequest('GET', COMPANY.GMB.ALL_ROUTE_API)]);

    let routeList = [];
    for (const [regionCode, regionRouteList] of Object.entries(allRouteList.data.routes)) {
        (regionRouteList as string[]).forEach((route) => {
            let routeApi = company.ROUTE_API.replace(PLACEHOLDER.REGION, regionCode).replace(PLACEHOLDER.ROUTE, route);

            routeList.push(doRequest('GET', routeApi));
        });
    }

    const allRouteStopLastUpdateDate = await doRequest('GET', COMPANY.GMB.ROUTE_STOP_LAST_UPDATE_API).then(
        (response) => response.data,
    );

    let result = await Promise.all(routeList).then((routeResponse) =>
        routeResponse
            .map((route) =>
                route.data.map(
                    async (routeObj) =>
                        await Promise.all(
                            routeObj.directions.map(async (dir) => {
                                const cacheKey = `${company.CODE}_route_stop_${routeObj.route_id}_${dir.route_seq}`;
                                const lastUpdateDate = allRouteStopLastUpdateDate
                                    .find((o) => o.route_id === routeObj.route_id && o.route_seq === dir.route_seq)
                                    ?.last_update_date?.replace('+00:00', '+08:00');
                                const cacheLastUpdateDate = CacheUtil.getCache(cacheKey)?.data_timestamp;
                                const updateCache =
                                    lastUpdateDate == null ||
                                    cacheLastUpdateDate == null ||
                                    new Date(cacheLastUpdateDate) > new Date(lastUpdateDate);

                                let routeStopData;
                                let stopList;
                                if (updateCache) {
                                    const routeStopApi = company.ROUTE_STOP_API.replace(
                                        PLACEHOLDER.ROUTE,
                                        routeObj.route_id,
                                    ).replace(PLACEHOLDER.ROUTE_TYPE, dir.route_seq);
                                    routeStopData = await doRequest('GET', routeStopApi).then(
                                        (response) => response.data,
                                    );
                                    CacheUtil.setCache(cacheKey, routeStopData);

                                    core.exportVariable('updateCache', true);
                                } else {
                                    routeStopData = CacheUtil.getCache(cacheKey);
                                }
                                try {
                                    stopList = routeStopData.route_stops.map((stop) => {
                                        const stopDetail = CacheUtil.getCache(`${company.CODE}_stop_${stop.stop_id}`);
                                        return new Stop(
                                            stop.stop_id,
                                            stop.name_tc,
                                            stopDetail.coordinates.wgs84.latitude,
                                            stopDetail.coordinates.wgs84.longitude,
                                        );
                                    });
                                } catch (e) {
                                    core.exportVariable('runUpdateStopName', true);
                                    throw e;
                                }
                                return new Route(
                                    company.CODE,
                                    routeObj.route_code,
                                    dir.route_seq,
                                    undefined,
                                    dir.orig_tc,
                                    dir.dest_tc,
                                    stopList,
                                    routeObj.route_id,
                                    routeObj.description_tc,
                                );
                            }),
                        ),
                ),
            )
            .flat(1),
    );

    return await Promise.all(result).then((result) => result.flat(1));
}
