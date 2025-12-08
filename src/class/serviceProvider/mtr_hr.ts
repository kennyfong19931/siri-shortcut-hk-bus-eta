import { parseCsvString } from '../../utils/csvUtil';
import { doRequest } from '../../utils/requestUtil';
import { Route } from '../Route';
import { Stop } from '../Stop';
import { COMPANY } from '../../constant';
import SpatialUtil from '../../utils/spatialUtil';

const company = COMPANY.MTR_HR;

export async function crawlRoute(): Promise<Route[]> {
    const [routeList] = await Promise.all([doRequest('GET', company.ROUTE_API, null, null, null, true)]).then(
        async ([routeCsv]) => await Promise.all([parseCsvString(routeCsv)]),
    );

    const routeWhitelist = ['AEL', 'TCL', 'TML', 'TKL', 'EAL', 'SIL', 'TWL', 'ISL', 'KTL', 'DRL'];
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

    const routeListByLineAndDirection = routeList
        .filter((route) => routeWhitelist.includes(route['Line Code']) && route['Direction'].endsWith('UT'))
        .reduce((result, item) => {
            const key = item['Line Code'] + '|' + item['Direction'];
            if (!result[key]) {
                result[key] = [];
            }
            result[key].push({
                code: item['Station Code'],
                name: item['Chinese Name'],
            });
            return result;
        }, {} as Record<string, any>);

    const routeListByLine = {};
    Object.keys(routeListByLineAndDirection).forEach((key) => {
        const lineCode = key.split('|')[0];
        let finalStationList = [];
        if (routeListByLine[lineCode]) {
            finalStationList = routeListByLine[lineCode];
        }

        // find terminus
        let stationList = routeListByLineAndDirection[key];
        stationList[0].railwayFilterDir = 'UT';
        stationList[stationList.length - 1].railwayFilterDir = 'DT';

        // remove duplicate station
        for (let i = 0; i < stationList.length; i++) {
            if (!finalStationList.some((station) => station.code === stationList[i].code)) {
                finalStationList.push(stationList[i]);
            }
        }

        routeListByLine[lineCode] = finalStationList;
    });

    if (routeListByLine['EAL']) {
        // RAC is missing from the csv
        let stationList = [];
        for (const station of routeListByLine['EAL']) {
            stationList.push(station);
            if (station.name === '火炭') {
                stationList.push({
                    code: 'RAC',
                    name: '馬場',
                });
            }
        }
        routeListByLine['EAL'] = stationList;
    }

    return await Promise.all(
        Object.entries(routeListByLine).map(async ([key, stationList]) => {
            const lineCode = key;
            let routeType = undefined;
            const routeName = routeNameList.filter((route) => route.code == lineCode)[0].name;
            let orig = (stationList as Array<any>)
                .filter((station) => station.railwayFilterDir === 'UT')
                .reduce((result, item) => {
                    result += (result !== '' ? '/' : '') + item.name;
                    return result;
                }, '');
            let dest = (stationList as Array<any>)
                .filter((station) => station.railwayFilterDir === 'DT')
                .reduce((result, item) => {
                    result += (result !== '' ? '/' : '') + item.name;
                    return result;
                }, '');

            const stopList = await Promise.all(
                Array.from(stationList as Array<any>).map(async (station) => {
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
                    if (station.railwayFilterDir) {
                        stop.setRailwayFilterDir(station.railwayFilterDir);
                    }
                    return stop;
                }),
            );
            return new Route(company.CODE, routeName, routeType, undefined, orig, dest, stopList, lineCode);
        }),
    );
}
