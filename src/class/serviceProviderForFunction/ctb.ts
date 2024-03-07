import dayjs from 'dayjs';
import { COMPANY, PLACEHOLDER, noETA } from '../../constant';
import ValidationUtil from '../../utils/validateUtil';

const company = COMPANY.CTB;

export function validateEtaRequest(requestItem) {
    if (!ValidationUtil.containsAllKey(requestItem, ['dir'])) {
        throw new Error('Missing parameter: dir');
    }
}

export async function fetchEta(requestItem) {
    const api = company.ETA_API.replace(PLACEHOLDER.COMPANY, company.CODE)
        .replace(PLACEHOLDER.STOP, requestItem.stop)
        .replace(PLACEHOLDER.ROUTE, requestItem.routeId);

    const etaResponse = await fetch(api)
        .then((response) => response.json())
        .then((json) =>
            json.data
                .filter((data) => data.dir == requestItem.dir)
                .map((data) => {
                    if (data == null) return noETA;
                    else
                        return {
                            eta: dayjs(data.eta, 'YYYY-MM-DDTHH:mm:ssZ').diff(dayjs(), 'minute'),
                            remark: data.rmk_tc == '' ? undefined : data.rmk_tc,
                        };
                }),
        );

    return etaResponse.length == 0 ? noETA : etaResponse;
}
