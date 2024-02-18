import dayjs from 'dayjs';
import { COMPANY, PLACEHOLDER } from '../../constant';

const company = COMPANY.NLB;

export async function fetchEta(requestItem) {
    const api = company.ETA_API.replace(PLACEHOLDER.STOP, requestItem.stop).replace(
        PLACEHOLDER.ROUTE,
        requestItem.routeId,
    );

    return await fetch(api)
        .then((response) => response.json())
        .then((json) => {
            if (json.estimatedArrivals.length == 0)
                return [
                    {
                        eta: null,
                        remark: json.message,
                    },
                ];
            else
                return json.estimatedArrivals.map((data) => {
                    return {
                        eta: dayjs(`${data.estimatedArrivalTime}+08:00`, 'YYYY-MM-DD HH:mm:ss').diff(dayjs(), 'minute'),
                        remark: data.remarks_tc == '' ? undefined : data.remarks_tc,
                        routeVariantName: data.routeVariantName,
                        wheelChair: data.wheelChair,
                    };
                });
        });
}
