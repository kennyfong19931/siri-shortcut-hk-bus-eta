import dayjs from 'dayjs';
import { COMPANY, PLACEHOLDER } from '../../constant';
import ValidationUtil from '../../utils/validateUtil';

const company = COMPANY.KMB;

export function validateEtaRequest(requestItem) {
    if (!ValidationUtil.containsAllKey(requestItem, ['routeType', 'dir'])) {
        throw new Error('Missing parameter: routeType/dir');
    }
}

export async function fetchEta(requestItem) {
    const api = company.ETA_API.replace(PLACEHOLDER.STOP, requestItem.stop)
        .replace(PLACEHOLDER.ROUTE, requestItem.routeId)
        .replace(PLACEHOLDER.ROUTE_TYPE, requestItem.routeType);

    return await fetch(api)
        .then((response) => response.json())
        .then((json) =>
            json.data
                .filter((data) => data.dir == requestItem.dir)
                .map((data) => {
                    return {
                        eta: dayjs(data.eta, 'YYYY-MM-DDTHH:mm:ssZ').diff(dayjs(), 'minute'),
                        remark: data.rmk_tc == '' ? undefined : data.rmk_tc,
                    };
                }),
        );
}
