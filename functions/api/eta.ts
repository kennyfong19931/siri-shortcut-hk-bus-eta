import dayjs from "dayjs";
import { jsonResponse } from "../../src/utils/jsonResponse";
import { COMPANY, PLACEHOLDER } from "../../src/constant";
import ValidationUtil from "../../src/utils/validateUtil";

const noETA = [{ eta: null, remark: "未有資料" }];
let mtr_hr_data;

async function getMtrHrData(host) {
    if (mtr_hr_data !== undefined) {
        return mtr_hr_data;
    } else {
        mtr_hr_data = await fetch(`${host}/api/route/mtr_hr.json`)
            .then(response => response.json());
        return mtr_hr_data;
    }
}

async function getRouteJson(host, route) {
    return await fetch(`${host}/api/route/${route}.json`)
        .then(response => response.json());
}

export async function onRequestPost({ request, env }) {
    const requestBody = JSON.parse(await request.text());
    let response = [];
    let api;

    // validation
    if (!Array.isArray(requestBody)) {
        return jsonResponse({ error: "Invalid parameter" }, { status: 400, statusText: "Invalid parameter" });
    }
    for (const requestItem of requestBody) {
        if (!ValidationUtil.containsAllKey(requestItem, ["company", "routeId", "stop"])) {
            return jsonResponse({ error: "Missing parameter: company/routeId/stop" }, { status: 400, statusText: "Invalid parameter" });
        }

        const company = Object.values(COMPANY).find(c => c.CODE == requestItem.company);
        if (company == undefined) {
            return jsonResponse({ error: "Invalid parameter. company not found" }, { status: 400, statusText: "Invalid parameter" });
        } else {
            switch (company.CODE) {
                case COMPANY.KMB.CODE:
                    if (!ValidationUtil.containsAllKey(requestItem, ["routeType", "dir"])) {
                        return jsonResponse({ error: "Missing parameter: routeType/dir" }, { status: 400, statusText: "Invalid parameter" });
                    }
                    break;
                case COMPANY.CTB.CODE:
                case COMPANY.NWFB.CODE:
                case COMPANY.MTR_HR.CODE:
                case COMPANY.MTR_LR.CODE:
                    if (!ValidationUtil.containsAllKey(requestItem, ["dir"])) {
                        return jsonResponse({ error: "Missing parameter: dir" }, { status: 400, statusText: "Invalid parameter" });
                    }
                    break;
                case COMPANY.GMB.CODE:
                    if (!ValidationUtil.containsAllKey(requestItem, ["routeType"])) {
                        return jsonResponse({ error: "Missing parameter: routeType" }, { status: 400, statusText: "Invalid parameter" });
                    }
                    break;
            }
        }
    }

    // ETA
    for (const requestItem of requestBody) {
        try {
            let etaResponse;
            const company = Object.values(COMPANY).find(c => c.CODE == requestItem.company);
            switch (company.CODE) {
                case COMPANY.KMB.CODE:
                    api = company.ETA_API.replace(PLACEHOLDER.STOP, requestItem.stop)
                        .replace(PLACEHOLDER.ROUTE, requestItem.routeId)
                        .replace(PLACEHOLDER.ROUTE_TYPE, requestItem.routeType);

                    response.push(await fetch(api)
                        .then(response => response.json())
                        .then(json => json.data.filter(data => data.dir == requestItem.dir)
                            .map(data => {
                                return {
                                    eta: dayjs(data.eta, "YYYY-MM-DDTHH:mm:ssZ").diff(dayjs(), "minute"),
                                    remark: data.rmk_tc == "" ? undefined : data.rmk_tc,
                                }
                            }))
                    );
                    break;
                case COMPANY.CTB.CODE:
                case COMPANY.NWFB.CODE:
                    api = company.ETA_API.replace(PLACEHOLDER.COMPANY, company.CODE)
                        .replace(PLACEHOLDER.STOP, requestItem.stop)
                        .replace(PLACEHOLDER.ROUTE, requestItem.routeId);

                    etaResponse = await fetch(api)
                        .then(response => response.json())
                        .then(json => json.data.filter(data => data.dir == requestItem.dir)
                            .map(data => {
                                if (data == null)
                                    return noETA;
                                else
                                    return {
                                        eta: dayjs(data.eta, "YYYY-MM-DDTHH:mm:ssZ").diff(dayjs(), "minute"),
                                        remark: data.rmk_tc == "" ? undefined : data.rmk_tc,
                                    }
                            }));

                    if (etaResponse.length == 0) {
                        response.push(noETA);
                    } else {
                        response.push(etaResponse);
                    }
                    break;
                case COMPANY.NLB.CODE:
                    api = company.ETA_API.replace(PLACEHOLDER.STOP, requestItem.stop)
                        .replace(PLACEHOLDER.ROUTE, requestItem.routeId);

                    response.push(await fetch(api)
                        .then(response => response.json())
                        .then(json => {
                            if (json.estimatedArrivals.length == 0)
                                return [{
                                    eta: null,
                                    remark: json.message
                                }];
                            else
                                return json.estimatedArrivals.map(data => {
                                    return {
                                        eta: dayjs(`${data.estimatedArrivalTime}+08:00`, "YYYY-MM-DD HH:mm:ss").diff(dayjs(), "minute"),
                                        remark: data.remarks_tc == "" ? undefined : data.remarks_tc,
                                        routeVariantName: data.routeVariantName,
                                        wheelChair: data.wheelChair
                                    }
                                });
                        })
                    );
                    break;
                case COMPANY.GMB.CODE:
                    api = company.ETA_API.replace(PLACEHOLDER.STOP, requestItem.stop)
                        .replace(PLACEHOLDER.ROUTE, requestItem.routeId);

                    etaResponse = await fetch(api, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36",
                        }
                    })
                        .then(response => response.json())
                        .then(json => json.data.filter(data => data.route_seq == requestItem.routeType)
                            .map(data => data.eta.map(data => {
                                return {
                                    eta: data.diff,
                                    remark: data.remarks_tc,
                                }
                            }))
                            .flat(1)
                        );

                    if (etaResponse.length == 0) {
                        response.push(noETA);
                    } else {
                        response.push(etaResponse);
                    }
                    break;
                case COMPANY.MTR.CODE:
                    etaResponse = await fetch(company.ETA_API, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            routeName: requestItem.routeId,
                            language: "zh"
                        })
                    })
                        .then(response => response.json())
                        .then(json => {
                            return json.busStop.filter((busStop) => busStop.busStopId == requestItem.stop)
                                .map(data => data.bus.map((bus) => {
                                    return {
                                        eta: Math.floor(bus.departureTimeInSecond / 60),
                                        remark: bus.remarks_tc ? "預定班次" : undefined,
                                    }
                                }))
                                .flat(1);
                        });

                    if (etaResponse.length == 0) {
                        response.push(noETA);
                    } else {
                        response.push(etaResponse.slice(0, Math.min(3, etaResponse.length)));
                    }
                    break;
                case COMPANY.MTR_HR.CODE:
                    api = company.ETA_API.replace(PLACEHOLDER.STOP, requestItem.stop)
                        .replace(PLACEHOLDER.ROUTE, requestItem.routeId);
                        
                    const mtrHrData = await getMtrHrData(env.host);

                    etaResponse = await fetch(api)
                        .then(response => response.json())
                        .then(json => {
                            if (json.status === 0) {
                                return [{ eta: null, remark: json.message, url: json.url }];
                            }
                            let directionKey = "UT" === requestItem.dir ? "UP" : "DOWN";
                            return json.data[`${requestItem.routeId}-${requestItem.stop}`][directionKey].map(data => {
                                let dest;
                                if (mtrHrData === null) {
                                    dest = data.dest;
                                } else {
                                    dest = mtrHrData.map((route) => route.stopList)
                                        .flat(1)
                                        .filter((stop) => stop.id === data.dest)[0].name;
                                }

                                let remark = undefined;
                                if (requestItem.routeId === 'EAL' && data.route === 'RAC') {
                                    remark = '經馬場'
                                }
                                return {
                                    eta: dayjs(`${data.time}+08:00`, "YYYY-MM-DD HH:mm:ss").diff(dayjs(), "minute"),
                                    platform: data.plat,
                                    dest: dest,
                                    remark: remark,
                                }
                            });
                        });

                    if (etaResponse.length == 0) {
                        response.push(noETA);
                    } else {
                        response.push(etaResponse);
                    }
                    break;
                case COMPANY.MTR_LR.CODE:
                    api = company.ETA_API.replace(PLACEHOLDER.STOP, requestItem.stop);

                    const mtrLrData = await getRouteJson(env.host, requestItem.routeId);
                    const dest = mtrLrData.filter((route) => route.company === company.CODE && route.routeId === requestItem.routeId && route.dir === requestItem.dir)[0].dest;

                    etaResponse = await fetch(api)
                        .then(response => response.json())
                        .then(json => {
                            if (json.status === 0) {
                                return noETA;
                            }

                            let routeStopped = false;
                            json.platform_list.forEach((platform) => {
                                platform.route_list.forEach((route) => {
                                    if (route.stop === 1 && route.route_no === requestItem.routeId) {
                                        routeStopped = true;
                                    }
                                })
                            })
                            if(routeStopped){
                                let remark = '暫停服務';
                                let url = undefined;
                                if (json.red_alert_message_ch) {
                                    remark = json.red_alert_message_ch;
                                }
                                if (json.red_alert_url_ch) {
                                    url = json.red_alert_url_ch;
                                }
                                return [{
                                    eta: null,
                                    remark: remark,
                                    url: url,
                                }]
                            }

                            console.log(json.platform_list);

                            return json.platform_list.map((platform) => {
                                if (platform.route_list.filter((train) => train.stop === 1 && train.route_no === requestItem.routeId).length) {
                                    let remark = '暫停服務';
                                    let url = undefined;
                                    if (json.red_alert_message_ch) {
                                        remark += ' ' + json.red_alert_message_ch;
                                    }
                                    if (json.red_alert_url_ch) {
                                        url = json.red_alert_url_ch;
                                    }
                                    return [{
                                        eta: null,
                                        remark: remark,
                                        url: url,
                                    }]
                                } else {
                                    return platform.route_list.filter((train) => train.stop === 0 && train.route_no === requestItem.routeId &&
                                        ((train.route_no === '705' || train.route_no === '706') ? true : train.dest_ch === dest))
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
                                            }
                                        });
                                }
                            })
                                .flat();
                        });

                    if (etaResponse.length == 0) {
                        response.push(noETA);
                    } else {
                        response.push(etaResponse);
                    }
                    break;
            }
        } catch (e) {
            response.push(noETA);
        }
    }

    let returnValue = {};
    for (let [index, value] of response.entries()) {
        returnValue[index] = value;
    }

    return jsonResponse(returnValue);
};
