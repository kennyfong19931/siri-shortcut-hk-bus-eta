import dayjs from 'dayjs';
import { COMPANY, PLACEHOLDER, noETA } from '../../constant';
import ValidationUtil from '../../utils/validateUtil';

const company = COMPANY.MTR_HR;

export function validateEtaRequest(requestItem) {
    if (!ValidationUtil.containsAllKey(requestItem, ['dir'])) {
        throw new Error('Missing parameter: dir');
    }
}

export async function fetchEta(requestItem, env, request) {
    const api = company.ETA_API.replace(PLACEHOLDER.STOP, requestItem.stop).replace(
        PLACEHOLDER.ROUTE,
        requestItem.routeId,
    );

    const mtrHrData = await env.ASSETS.fetch(new Request(new URL('/api/route/mtr_hr.json', request.url))).then((r) =>
        r.json(),
    );

    const etaResponse = await fetch(api)
        .then((response) => response.json())
        .then((json) => {
            if (json.status === 0) {
                return [{ eta: null, remark: json.message, url: json.url }];
            }
            let directionKey = 'UT' === requestItem.dir ? 'UP' : 'DOWN';
            return json.data[`${requestItem.routeId}-${requestItem.stop}`][directionKey].map((data) => {
                let dest;
                if (mtrHrData === null) {
                    dest = data.dest;
                } else {
                    dest = mtrHrData
                        .map((route) => route.stopList)
                        .flat(1)
                        .filter((stop) => stop.id === data.dest)[0].name;
                }

                let remark = undefined;
                if (requestItem.routeId === 'EAL' && data.route === 'RAC') {
                    remark = '經馬場';
                }
                return {
                    eta: dayjs(`${data.time}+08:00`, 'YYYY-MM-DD HH:mm:ss').diff(dayjs(), 'minute'),
                    platform: data.plat,
                    dest: dest,
                    remark: remark,
                };
            });
        });

    return etaResponse.length == 0 ? noETA : etaResponse;
}
