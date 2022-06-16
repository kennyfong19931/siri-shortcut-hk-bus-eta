import dayjs from "dayjs";
import { jsonResponse } from "../../src/utils/jsonResponse";
import { COMPANY, PLACEHOLDER } from "../../src/constant";
import ValidationUtil from "../../src/utils/validateUtil";

const noETA = [{ eta: null, remark: "未有資料" }];

export async function onRequestPost({ request }) {
    const requestBody = JSON.parse(await request.text());
    let response = [];
    let api;

    // validation
    if (!Array.isArray(requestBody)) {
        return jsonResponse({ error: "Invalid parameter" }, { status: 400, statusText: "Invalid parameter" });
    }
    for (const requestItem of requestBody) {
        if (!ValidationUtil.containsAllKey(requestItem, ["company", "route", "stop"])) {
            return jsonResponse({ error: "Invalid parameter" }, { status: 400, statusText: "Invalid parameter" });
        }

        const company = Object.values(COMPANY).find(c => c.CODE == requestItem.company);
        if (company == undefined) {
            return jsonResponse({ error: "Invalid parameter" }, { status: 400, statusText: "Invalid parameter" });
        } else {
            switch (company.CODE) {
                case COMPANY.KMB.CODE:
                    if (!ValidationUtil.containsAllKey(requestItem, ["routeType", "dir"])) {
                        return jsonResponse({ error: "Invalid parameter" }, { status: 400, statusText: "Invalid parameter" });
                    }
                    break;
                case COMPANY.CTB.CODE:
                case COMPANY.NWFB.CODE:
                    if (!ValidationUtil.containsAllKey(requestItem, ["dir"])) {
                        return jsonResponse({ error: "Invalid parameter" }, { status: 400, statusText: "Invalid parameter" });
                    }
                    break;
                case COMPANY.GMB.CODE:
                    if (!ValidationUtil.containsAllKey(requestItem, ["routeType"])) {
                        return jsonResponse({ error: "Invalid parameter" }, { status: 400, statusText: "Invalid parameter" });
                    }
                    break;
            }
        }
    }

    // ETA
    for (const requestItem of requestBody) {
        let etaResponse;
        const company = Object.values(COMPANY).find(c => c.CODE == requestItem.company);
        switch (company.CODE) {
            case COMPANY.KMB.CODE:
                api = company.ETA_API.replace(PLACEHOLDER.STOP, requestItem.stop)
                    .replace(PLACEHOLDER.ROUTE, requestItem.route)
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
                    .replace(PLACEHOLDER.ROUTE, requestItem.route);

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
                response.push(await fetch(company.ETA_API, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        routeId: requestItem.route,
                        stopId: requestItem.stop,
                        language: "zh"
                    })
                })
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
                                    eta: dayjs(data.estimatedArrivalTime, "YYYY-MM-DD HH:mm:ss").subtract(8, 'hour').diff(dayjs(), "minute"),
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
                    .replace(PLACEHOLDER.ROUTE, requestItem.route)
                    .replace(PLACEHOLDER.ROUTE_TYPE, requestItem.routeType);

                etaResponse = await fetch(api)
                    .then(response => response.json())
                    .then(json => json.data.eta.map(data => {
                        return {
                            eta: data.diff,
                            remark: data.remarks_tc,
                        }
                    }));

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
                        routeName: requestItem.route,
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
        }
    }

    return jsonResponse(response);
};
