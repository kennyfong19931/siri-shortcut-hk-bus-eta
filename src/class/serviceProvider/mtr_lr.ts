import { parseCsvString } from '../../utils/csvUtil';
import { doRequest } from '../../utils/requestUtil';
import { Route } from '../Route';
import { Stop } from '../Stop';
import { COMPANY, PLACEHOLDER } from '../../constant';
import SpatialUtil from '../../utils/spatialUtil';

const company = COMPANY.MTR_LR;

export async function crawlRoute(): Promise<Route[]> {
    const [routeList] = await Promise.all([doRequest('GET', company.ROUTE_API, null, null, null, true)]).then(
        async ([routeCsv]) => await Promise.all([parseCsvString(routeCsv)]),
    );

    let routeListByLine = routeList.reduce((result, item) => {
        const key = item['Line Code'] + '-' + item['Direction'];
        if (!result[key]) {
            result[key] = [];
        }
        result[key].push({ code: item['Stop ID'], name: item['Chinese Name'] });
        return result;
    }, {} as Record<string, any>);

    return await Promise.all(
        Object.entries(routeListByLine).map(async ([key, stationList]) => {
            const keyArray = key.split('-');
            const lineCode = keyArray[0];
            const direction = keyArray[1];
            const stopList = await Promise.all(
                Array.from(stationList as Array<any>).map(async (station) => {
                    const coordinates = await doRequest(
                        'GET',
                        `https://geodata.gov.hk/gs/api/v1.0.0/locationSearch?q=輕鐵－${station.name}`,
                    ).then((response) => SpatialUtil.fromHK80ToWGS84([response[0].x, response[0].y]));
                    let stop = new Stop(
                        station.code,
                        station.name,
                        coordinates[0].toString(),
                        coordinates[1].toString(),
                    );
                    return stop;
                }),
            );
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
        }),
    );
}
