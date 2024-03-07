import * as core from '@actions/core';
import { doRequest } from '../../utils/requestUtil';
import { Route } from '../Route';
import { Stop } from '../Stop';
import { COMPANY, PLACEHOLDER } from '../../constant';
import CacheUtil from '../../utils/cacheUtil';

const company = COMPANY.CTB;

export async function crawlRoute(): Promise<Route[]> {
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

    let result = [];
    for (const route of routeListWithBound) {
        let routeStopApi = company.ROUTE_STOP_API.replace(PLACEHOLDER.COMPANY, company.CODE)
            .replace(PLACEHOLDER.ROUTE, route.route)
            .replace(PLACEHOLDER.DIRECTION, route.dirParam);
        let response = await doRequest('GET', routeStopApi);

        if (response.data.length > 0) {
            let stopList = response.data
                .map((routeStop) => CacheUtil.getCache(`${company.CODE}_stop_${routeStop.stop}`))
                .map((json) => {
                    try {
                        return new Stop(json.stop, json.name_tc, json.lat, json.long);
                    } catch (e) {
                        core.exportVariable('runUpdateStopName', true);
                        throw e;
                    }
                })
                .filter((s) => s !== undefined);
            result.push(new Route(company.CODE, route.route, null, route.dir, route.orig, route.dest, stopList));
        }
    }
    return result;
}
