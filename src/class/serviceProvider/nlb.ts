import { doRequest } from '../../utils/requestUtil';
import { Route } from '../Route';
import { Stop } from '../Stop';
import { COMPANY, PLACEHOLDER } from '../../constant';

const company = COMPANY.NLB;

export async function crawlRoute(): Promise<Route[]> {
    const [routeList] = await Promise.all([doRequest('GET', company.ROUTE_API)]);

    let result = routeList.routes.map(async (route) => {
        const routeDest = route.routeName_c.split('>');

        let routeStopApi = company.ROUTE_STOP_API.replace(PLACEHOLDER.ROUTE, route.routeId);
        const stopList = await doRequest('GET', routeStopApi).then((response) =>
            response.stops.map(
                (stop) =>
                    new Stop(
                        stop.stopId,
                        stop.stopName_c,
                        stop.latitude,
                        stop.longitude,
                        stop.stopLocation_c,
                        stop.fare,
                        stop.fareHoliday,
                    ),
            ),
        );

        return new Route(
            company.CODE,
            route.routeNo,
            null,
            null,
            routeDest[0].trim(),
            routeDest[1].trim(),
            stopList,
            route.routeId,
        );
    });

    return await Promise.all(result).then((route) => route.sort((a, b) => a.routeId - b.routeId)); // sort by routeId asc
}
