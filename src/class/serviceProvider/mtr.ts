import csv from 'csvtojson';

import { doRequest } from '../../utils/requestUtil';
import { Route } from '../Route';
import { Stop } from '../Stop';
import { COMPANY } from '../../constant';

const company = COMPANY.MTR;

export async function crawlRoute(): Promise<Route[]> {
    const [routeList, stopList] = await Promise.all([
        doRequest('GET', company.ROUTE_API, null, null, null, true),
        doRequest('GET', company.ROUTE_STOP_API, null, null, null, true),
    ]).then(
        async ([routeList, stopList]) => await Promise.all([csv().fromString(routeList), csv().fromString(stopList)]),
    );

    return routeList
        .filter((route) => route.ROUTE_ID != '')
        .map((route) => {
            let routeStop = stopList.filter((stop) => stop.ROUTE_ID == route.ROUTE_ID);
            return ['O', 'I']
                .map((dir) => {
                    let stopList = routeStop
                        .filter((stop) => stop.DIRECTION == dir)
                        .map(
                            (stop) =>
                                new Stop(
                                    stop.STATION_ID,
                                    stop.STATION_NAME_CHI,
                                    stop.STATION_NAME_ENG,
                                    stop.STATION_LATITUDE,
                                    stop.STATION_LONGITUDE,
                                ),
                        );
                    if (stopList.length == 0) return null;
                    else
                        return new Route(
                            company.CODE,
                            route.ROUTE_ID,
                            route.ROUTE_ID,
                            null,
                            dir,
                            stopList.at(0).getName(),
                            stopList.at(0).getNameEn(),
                            stopList.at(-1).getName(),
                            stopList.at(-1).getNameEn(),
                            stopList,
                        );
                })
                .filter((result) => result != null);
        })
        .flat(1);
}
