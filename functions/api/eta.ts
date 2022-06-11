import dayjs from "dayjs";
import { jsonResponse } from "../../src/utils/jsonResponse";
import { COMPANY, PLACEHOLDER } from "../../src/constant";
import ValidationUtil from "../../src/utils/validateUtil";


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
                                remark: data.rmk_tc,
                            }
                        }))
                );
                break;
            case COMPANY.CTB.CODE:
            case COMPANY.NWFB.CODE:
                api = company.ETA_API.replace(PLACEHOLDER.COMPANY, company.CODE)
                    .replace(PLACEHOLDER.STOP, requestItem.stop)
                    .replace(PLACEHOLDER.ROUTE, requestItem.route);

                response.push(await fetch(api)
                    .then(response => response.json())
                    .then(json => json.data.filter(data => data.dir == requestItem.dir)
                        .map(data => {
                            return {
                                eta: dayjs(data.eta, "YYYY-MM-DDTHH:mm:ssZ").diff(dayjs(), "minute"),
                                remark: data.rmk_tc,
                            }
                        }))
                );
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
                        let message = json.message;
                        return json.estimatedArrivals.map(data => {
                            return {
                                eta: dayjs(data.estimatedArrivalTime, "YYYY-MM-DD HH:mm:ss").diff(dayjs(), "minute"),
                                remark: data.remarks_tc,
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

                response.push(await fetch(api)
                    .then(response => response.json())
                    .then(json => json.data.eta.map(data => {
                        return {
                            eta: data.diff,
                            remark: data.remarks_tc,
                        }
                    }))
                );
                break;
        }
    }

    return jsonResponse(response);
};
