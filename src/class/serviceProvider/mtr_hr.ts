import csv from 'csvtojson';

import { doRequest } from '../../utils/requestUtil';
import { Route } from '../Route';
import { Stop } from '../Stop';
import { COMPANY } from '../../constant';
import SpatialUtil from '../../utils/spatialUtil';

const company = COMPANY.MTR_HR;

export async function crawlRoute(): Promise<Route[]> {
    const [routeList] = await Promise.all([doRequest('GET', company.ROUTE_API, null, null, true)]).then(
        async ([routeList]) => await Promise.all([csv().fromString(routeList)]),
    );

    const routeWhitelist = ['AEL', 'TCL', 'TML', 'TKL', 'EAL', 'SIL', 'TWL', 'ISL', 'KTL'];
    const routeNameList = [
        { code: 'AEL', name: '機場快線' },
        { code: 'TCL', name: '東湧線' },
        { code: 'TML', name: '屯馬線' },
        { code: 'TKL', name: '將軍澳線' },
        { code: 'EAL', name: '東鐵線' },
        { code: 'SIL', name: '南港島線' },
        { code: 'TWL', name: '荃灣線' },
        { code: 'ISL', name: '港島線' },
        { code: 'KTL', name: '觀塘線' },
        { code: 'DRL', name: '迪士尼線' },
    ];

    let routeListByLine = routeList
        .filter((route) => routeWhitelist.includes(route['Line Code']) && route['Direction'].endsWith('UT'))
        .reduce((result, item) => {
            const key = item['Line Code'];
            if (!result[key]) {
                result[key] = [];
            }
            result[key].push({
                code: item['Station Code'],
                name: item['Chinese Name'],
            });
            return result;
        }, {});
    return await Promise.all(
        Object.entries(routeListByLine).map(async ([key, stationList]) => {
            const keyArray = key.split('-');
            const lineCode = keyArray[0];
            let routeType = undefined;
            let direction;
            if (keyArray.length === 3) {
                routeType = keyArray[1];
                direction = keyArray[2];
            } else {
                direction = keyArray[1];
            }
            const routeName = routeNameList.filter((route) => route.code == lineCode)[0].name;

            const stationLength = (stationList as Array<any>).length;
            const stopList = await Promise.all(
                Array.from(stationList as Array<any>).map(async (station, index) => {
                    const coordinates = await doRequest(
                        'GET',
                        `https://geodata.gov.hk/gs/api/v1.0.0/locationSearch?q=港鐵${station.name}站`,
                    ).then((response) => SpatialUtil.fromHK80ToWGS84([response[0].x, response[0].y]));
                    let stop = new Stop(
                        station.code,
                        station.name,
                        coordinates[0].toString(),
                        coordinates[1].toString(),
                    );
                    if (index === 0) {
                        stop.setRailwayFilterDir('DT');
                    } else if (index === stationLength - 1) {
                        stop.setRailwayFilterDir('UT');
                    }
                    return stop;
                }),
            );
            return new Route(
                company.CODE,
                routeName,
                routeType,
                direction,
                stopList.at(0).getName(),
                stopList.at(-1).getName(),
                stopList,
                lineCode,
            );
        }),
    );
}
