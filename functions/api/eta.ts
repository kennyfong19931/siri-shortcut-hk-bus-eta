import { jsonResponse } from '../../src/utils/jsonResponse';
import { COMPANY, noETA } from '../../src/constant';
import { JointRoute } from '../../src/class/JointRoute';
import * as ServiceProvider from '../../src/class/serviceProviderForFunction';
import { getJointJson } from '../../src/utils/requestUtil';
import ValidationUtil from '../../src/utils/validateUtil';

export async function getEta(requestBody, env) {
    let response = [];

    // validation
    if (!Array.isArray(requestBody)) {
        return jsonResponse({ error: 'Invalid parameter' }, { status: 400, statusText: 'Invalid parameter' });
    }
    for (const requestItem of requestBody) {
        if (!ValidationUtil.containsAllKey(requestItem, ['company', 'routeId', 'stop'])) {
            return jsonResponse(
                { error: 'Missing parameter: company/routeId/stop' },
                { status: 400, statusText: 'Invalid parameter' },
            );
        }

        const company = Object.values(COMPANY).find((c) => c.CODE == requestItem.company);
        if (company == undefined) {
            return jsonResponse(
                { error: 'Invalid parameter. company not found' },
                { status: 400, statusText: 'Invalid parameter' },
            );
        } else {
            try {
                if (typeof ServiceProvider[company.CODE].validateEtaRequest === 'function') {
                    ServiceProvider[company.CODE].validateEtaRequest(requestItem);
                }
            } catch (error) {
                return jsonResponse({ error: error.message }, { status: 400, statusText: 'Invalid parameter' });
            }
        }
    }

    // ETA
    for (const requestItem of requestBody) {
        try {
            let etaResult = [];
            const company = Object.values(COMPANY).find((c) => c.CODE == requestItem.company);
            if (typeof ServiceProvider[company.CODE].fetchEta === 'function') {
                etaResult = await ServiceProvider[company.CODE].fetchEta(requestItem, env);
            }
            if (company.CODE === COMPANY.KMB.CODE) {
                const jointJson = getJointJson();
                const jointRouteConfig: JointRoute[] | undefined = Object.entries(jointJson).find(
                    ([route]) => route === requestItem.routeId,
                )?.[1];

                if (jointRouteConfig) {
                    const jointRoute = jointRouteConfig.find(
                        (item) =>
                            item.kmb &&
                            item.kmb.routeId === requestItem.routeId &&
                            item.kmb.dir === requestItem.dir &&
                            item.kmb.serviceType === requestItem.routeType,
                    );

                    if (!jointRoute) continue;

                    const jointStop = jointRoute.stopList.find((stop) => stop?.kmb === requestItem.stop);
                    if (!jointStop) continue;

                    const jointRequestItem = {
                        company: COMPANY.CTB.CODE,
                        routeId: jointRoute.ctb.routeId,
                        stop: jointStop.ctb,
                        dir: jointRoute.ctb.dir,
                        routeType: jointRoute.ctb.serviceType,
                    };

                    const ctbEta = await ServiceProvider[COMPANY.CTB.CODE].fetchEta(jointRequestItem, env);
                    if (ctbEta.length) {
                        etaResult.map((eta) => (eta.remark = '[九巴]' + (eta.remark ?? '')));
                        ctbEta.forEach((eta) => {
                            eta.remark = '[城巴]' + (eta.remark ?? '');
                            etaResult.push(eta);
                        });
                        etaResult = etaResult.filter((eta) => eta.eta !== null).sort((a, b) => a.eta - b.eta);
                    }
                }
            }
            if (company.CODE === COMPANY.CTB.CODE) {
                const jointJson = getJointJson();
                const jointRouteConfig: JointRoute[] | undefined = Object.entries(jointJson).find(
                    ([route]) => route === requestItem.routeId,
                )?.[1];

                if (jointRouteConfig) {
                    const jointRoute = jointRouteConfig.find(
                        (item) =>
                            item.ctb && item.ctb.routeId === requestItem.routeId && item.ctb.dir === requestItem.dir,
                    );

                    if (!jointRoute) continue;

                    const jointStop = jointRoute.stopList.find((stop) => stop?.ctb === requestItem.stop);
                    if (!jointStop) continue;

                    const jointRequestItem = {
                        company: COMPANY.KMB.CODE,
                        routeId: jointRoute.kmb.routeId,
                        stop: jointStop.kmb,
                        dir: jointRoute.kmb.dir,
                        routeType: jointRoute.kmb.serviceType,
                    };

                    const kmbEta = await ServiceProvider[COMPANY.KMB.CODE].fetchEta(jointRequestItem, env);
                    if (kmbEta.length) {
                        etaResult.map((eta) => (eta.remark = '[城巴]' + (eta.remark ?? '')));
                        kmbEta.forEach((eta) => {
                            eta.remark = '[九巴]' + (eta.remark ?? '');
                            etaResult.push(eta);
                        });
                        etaResult = etaResult.filter((eta) => eta.eta !== null).sort((a, b) => a.eta - b.eta);
                    }
                }
            }
            response.push(etaResult);
        } catch (e) {
            console.error(e);
            response.push(noETA);
        }
    }

    let returnValue = {};
    for (let [index, value] of response.entries()) {
        returnValue[index] = value;
    }

    return jsonResponse(returnValue);
}

export async function onRequestPost({ request, env }) {
    const requestBody = JSON.parse(await request.text());
    return await getEta(requestBody, env);
}
