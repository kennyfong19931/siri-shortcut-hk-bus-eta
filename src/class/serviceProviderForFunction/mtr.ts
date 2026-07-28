import { COMPANY, noETA } from '../../constant';
import { getRouteJson } from '../../utils/requestUtil';

const company = COMPANY.MTR;

export async function fetchEta(requestItem, env) {
    let routeType = null;
    if (requestItem.routeType) {
        routeType = requestItem.routeType;
    } else {
        // backward compatibility for call without routeType
        const routeJson = getRouteJson(requestItem.routeId);
        const filteredRoute = routeJson.filter(
            (route) => route.company === requestItem.company && route.routeId === requestItem.routeId,
        );
        if (filteredRoute.length === 0) {
            throw new Error('route not found');
        }
        requestItem.routeType = filteredRoute[0].routeType;
    }

    const etaResponse = await fetch(company.ETA_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            routeName: requestItem.routeId,
            language: 'zh',
        }),
    })
        .then((response) => response.json())
        .then((json) => {
            return json.busStop
                .filter((busStop) => busStop.busStopId == requestItem.stop && busStop.isSuspended === '0')
                .map((data) =>
                    data.bus
                        .filter((bus) => bus.lineRef === requestItem.routeType)
                        .map((bus) => {
                            return {
                                eta: Math.floor(
                                    (bus.departureTimeInSecond === '0' || bus.departureTimeInSecond.startsWith('-')
                                        ? bus.arrivalTimeInSecond
                                        : bus.departureTimeInSecond) / 60,
                                ),
                                remark: bus.isScheduled === '1' ? '預定班次' : undefined,
                            };
                        }),
                )
                .flat(1);
        });

    return etaResponse.length == 0 ? noETA : etaResponse;
}
