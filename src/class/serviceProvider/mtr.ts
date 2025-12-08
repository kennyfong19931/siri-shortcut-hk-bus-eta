import { parseCsvString } from '../../utils/csvUtil';
import { doRequest } from '../../utils/requestUtil';
import { Route } from '../Route';
import { Stop } from '../Stop';
import { COMPANY } from '../../constant';

const company = COMPANY.MTR;

export async function crawlRoute(): Promise<Route[]> {
    const [routeList, stopList] = await Promise.all([
        doRequest('GET', company.ROUTE_API, null, null, null, true),
        doRequest('GET', company.ROUTE_STOP_API, null, null, null, true),
    ]).then(async ([routeCsv, stopCsv]) => await Promise.all([parseCsvString(routeCsv), parseCsvString(stopCsv)]));

    return routeList
        .filter((route) => route.ROUTE_ID != '')
        .map((route) => {
            let routeStop = stopList.filter((stop) => stop.REFERENCE_ID === route.REFERENCE_ID);
            const routeOrigDest = route.ROUTE_NAME_CHI.split('至');

            // special handling for K53*
            if (route.ROUTE_ID == 'K53*') {
                route.ROUTE_ID = 'K53';
            }

            return ['O', 'I']
                .map((dir) => {
                    const lineDownExist = route.LINE_DOWN !== '';
                    const lineCode = dir === 'I' && lineDownExist ? route.LINE_DOWN : route.LINE_UP;
                    const routeOrig = routeOrigDest[dir === 'I' && lineDownExist ? 1 : 0];
                    const routeDest = routeOrigDest[dir === 'I' && lineDownExist ? 0 : 1];
                    let stopList = routeStop
                        .filter((stop) => stop.DIRECTION == dir)
                        .map(
                            (stop) =>
                                new Stop(
                                    stop.STATION_ID,
                                    stop.STATION_NAME_CHI,
                                    stop.STATION_LATITUDE,
                                    stop.STATION_LONGITUDE,
                                ),
                        );
                    if (stopList.length == 0) return null;
                    else
                        return new Route(
                            company.CODE,
                            route.ROUTE_ID,
                            lineCode,
                            dir,
                            routeOrig,
                            routeDest,
                            stopList,
                            route.REFERENCE_ID,
                            route.ROUTE_ID === route.REFERENCE_ID ? '正常班次' : '特別班次',
                        );
                })
                .filter((result) => result != null);
        })
        .flat(1);
}
