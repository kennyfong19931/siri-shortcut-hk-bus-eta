import { doRequest } from '../../utils/requestUtil';
import { Route } from '../Route';
import { Stop } from '../Stop';
import { COMPANY } from '../../constant';
import ValidationUtil from '../../../src/utils/validateUtil';

const company = COMPANY.KMB;

export async function crawlRoute(): Promise<Route[]> {
    const [routeList, stopList, routeStopList] = await Promise.all([
        doRequest('GET', company.ROUTE_API),
        doRequest('GET', company.STOP_API),
        doRequest('GET', company.ROUTE_STOP_API),
    ]);
    return routeList.data.map((route) => {
        return new Route(
            company.CODE,
            route.route,
            route.route,
            route.service_type,
            route.bound,
            route.orig_tc,
            route.orig_en,
            route.dest_tc,
            route.dest_en,
            (routeStopList.data as any[])
                .filter((s) => s.route == route.route && s.bound == route.bound && s.service_type == route.service_type)
                .map((routeStop) => {
                    let stop = (stopList.data as any[]).find((s) => s.stop == routeStop.stop);
                    if (stop == undefined) {
                        return undefined;
                    } else {
                        return new Stop(stop.stop, stop.name_tc, stop.name_en, stop.lat, stop.long);
                    }
                })
                .filter((s) => s !== undefined),
            undefined,
            route.service_type == 1 ? '正常班次' : '特別班次',
        );
    });
}
