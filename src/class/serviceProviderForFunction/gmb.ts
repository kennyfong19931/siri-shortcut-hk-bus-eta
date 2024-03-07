import { COMPANY, PLACEHOLDER, noETA } from '../../constant';
import ValidationUtil from '../../utils/validateUtil';

const company = COMPANY.GMB;

export function validateEtaRequest(requestItem) {
    if (!ValidationUtil.containsAllKey(requestItem, ['routeType'])) {
        throw new Error('Missing parameter: routeType');
    }
}

export async function fetchEta(requestItem) {
    const api = company.ETA_API.replace(PLACEHOLDER.STOP, requestItem.stop).replace(
        PLACEHOLDER.ROUTE,
        requestItem.routeId,
    );

    const etaResponse = await fetch(api, {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
        },
    })
        .then((response) => response.json())
        .then((json) =>
            json.data
                .filter((data) => data.route_seq == requestItem.routeType)
                .map((data) =>
                    data.eta.map((data) => {
                        return {
                            eta: data.diff,
                            remark: data.remarks_tc,
                        };
                    }),
                )
                .flat(1),
        );

    return etaResponse.length == 0 ? noETA : etaResponse;
}
