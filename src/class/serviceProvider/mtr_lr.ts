import {parseCsvString} from '../../utils/csvUtil';
import {doRequest} from '../../utils/requestUtil';
import {Route} from '../Route';
import {Stop} from '../Stop';
import {COMPANY} from '../../constant';
import SpatialUtil from '../../utils/spatialUtil';

const company = COMPANY.MTR_LR;

export async function crawlRoute(): Promise<Route[]> {
    const [routeList] = await Promise.all([doRequest('GET', company.ROUTE_API, undefined, undefined, undefined, true)]).then(
        async ([routeCsv]) => await Promise.all([parseCsvString(routeCsv)]),
    );

    // Collect distinct stops from routeList
    const distinctStops = new Map<string, string>(); // stopId -> stopName
    for (const item of routeList) {
        const stopId = item['Stop ID'];
        const stopName = item['Chinese Name'];
        if (!distinctStops.has(stopId)) {
            distinctStops.set(stopId, stopName);
        }
    }

    // Get lat/long by name for each distinct stop and cache it (stopId, stopName, lat, long)
    const stopNameCache = new Map<string, { stopName: string; lat: string; long: string }>();
    for (const [stopId, stopName] of distinctStops) {
        const coordinates = await doRequest(
            'GET',
            `https://www.map.gov.hk/gs/api/v1.0.0/locationSearch?q=輕鐵－${stopName}`,
        ).then((response) => SpatialUtil.fromHK80ToWGS84([response[0].x, response[0].y]));
        stopNameCache.set(stopId, { stopName, lat: coordinates[0].toString(), long: coordinates[1].toString() });
    }

    let routeListByLine = routeList.reduce((result, item) => {
        const key = item['Line Code'] + '-' + item['Direction'];
        if (!result[key]) {
            result[key] = [];
        }
        result[key].push({ code: item['Stop ID'], name: item['Chinese Name'] });
        return result;
    }, {} as Record<string, any>);

    const regularRoutes = await Promise.all(
        Object.entries(routeListByLine).map(async ([key, stationList]) => {
            const keyArray = key.split('-');
            const lineCode = keyArray[0];
            const direction = keyArray[1];
            const stopList = Array.from(stationList as Array<any>).map((station) => {
                const cached = stopNameCache.get(station.code);
                return new Stop(
                    station.code,
                    cached.stopName,
                    cached.lat,
                    cached.long,
                );
            });
            return new Route(
                company.CODE,
                lineCode,
                null,
                direction,
                stopList.at(0).getName(),
                stopList.at(-1).getName(),
                stopList,
                lineCode,
            );
        })
    );

    // special route
    const configResponse = await doRequest('GET', 'https://lrnt.mtr.com.hk/moblink/static/config.json');
    const getLRRoutes = configResponse.URL_CONFIG.api.getLRRoutes;
    const apiUrl = getLRRoutes.baseUrl + getLRRoutes.url;
    const response = await doRequest('GET', apiUrl, getLRRoutes.config);
    const specialRoutes = response.special_routes.flatMap((route) =>
        route.listTrip.map((trip, idx) => {
            const stopList = trip.listStation.map((station) => {
                const cached = stopNameCache.get(station.stationCode);
                return new Stop(
                    station.code,
                    cached.stopName,
                    cached.lat,
                    cached.long,
                );
            });
            return new Route(
                company.CODE,
                route.displayCode.replaceAll("*", ""),
                null,
                idx,
                stopList.at(0).getName(),
                stopList.at(-1).getName(),
                stopList,
                route.routeNo,
                '特別路線: ' + route.routeRemarksChi2
            );
        })
    );

    return [...regularRoutes, ...specialRoutes];
}
