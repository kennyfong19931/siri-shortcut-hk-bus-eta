import { COMPANY, noETA } from '../../constant';

const company = COMPANY.MTR;

export async function fetchEta(requestItem) {
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
                .filter((busStop) => busStop.busStopId == requestItem.stop)
                .map((data) =>
                    data.bus.map((bus) => {
                        return {
                            eta: Math.floor(bus.departureTimeInSecond / 60),
                            remark: bus.remarks_tc ? '預定班次' : undefined,
                        };
                    }),
                )
                .flat(1);
        });

    return etaResponse.length == 0 ? noETA : etaResponse;
}
