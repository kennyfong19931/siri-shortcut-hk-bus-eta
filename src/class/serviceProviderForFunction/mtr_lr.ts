import { COMPANY, PLACEHOLDER, noETA } from '../../constant';
import ValidationUtil from '../../utils/validateUtil';

const company = COMPANY.MTR_LR;

async function getRouteJson(host, route) {
    return await fetch(`${host}/api/route/${route}.json`).then((response) => response.json());
}

export function validateEtaRequest(requestItem) {
    if (!ValidationUtil.containsAllKey(requestItem, ['dir'])) {
        throw new Error('Missing parameter: dir');
    }
}

export async function fetchEta(requestItem, env) {
    const api = company.ETA_API.replace(PLACEHOLDER.STOP, requestItem.stop);

    const mtrLrData = await getRouteJson(env.host, requestItem.routeId);
    const dest = mtrLrData.filter(
        (route) =>
            route.company === company.CODE && route.routeId === requestItem.routeId && route.dir === requestItem.dir,
    )[0].dest;

    const etaResponse = await fetch(api)
        .then((response) => response.json())
        .then((json) => {
            if (json.status === 0) {
                return noETA;
            }

            let routeStopped = false;
            json.platform_list.forEach((platform) => {
                platform.route_list.forEach((route) => {
                    if (route.stop === 1 && route.route_no === requestItem.routeId) {
                        routeStopped = true;
                    }
                });
            });
            if (routeStopped) {
                let remark = '暫停服務';
                let url = undefined;
                if (json.red_alert_message_ch) {
                    remark = json.red_alert_message_ch;
                }
                if (json.red_alert_url_ch) {
                    url = json.red_alert_url_ch;
                }
                return [
                    {
                        eta: null,
                        remark: remark,
                        url: url,
                    },
                ];
            }

            console.log(json.platform_list);

            return json.platform_list
                .map((platform) => {
                    if (
                        platform.route_list.filter(
                            (train) => train.stop === 1 && train.route_no === requestItem.routeId,
                        ).length
                    ) {
                        let remark = '暫停服務';
                        let url = undefined;
                        if (json.red_alert_message_ch) {
                            remark += ' ' + json.red_alert_message_ch;
                        }
                        if (json.red_alert_url_ch) {
                            url = json.red_alert_url_ch;
                        }
                        return [
                            {
                                eta: null,
                                remark: remark,
                                url: url,
                            },
                        ];
                    } else {
                        return platform.route_list
                            .filter(
                                (train) =>
                                    train.stop === 0 &&
                                    train.route_no === requestItem.routeId &&
                                    (train.route_no === '705' || train.route_no === '706'
                                        ? true
                                        : train.dest_ch === dest),
                            )
                            .map((train) => {
                                let remark = null;
                                let eta = 0;
                                if (train.time_ch === '正在離開' || train.time_ch === '即將抵達') {
                                    remark = train.time_ch;
                                } else if (train.time_ch !== '-') {
                                    eta = parseInt(train.time_en.replace(' min', ''));
                                }
                                return {
                                    eta: eta,
                                    platform: platform.platform_id,
                                    dest: train.dest_ch,
                                    trainLength: train.train_length,
                                    remark: remark,
                                };
                            });
                    }
                })
                .flat();
        });

    return etaResponse.length == 0 ? noETA : etaResponse;
}
