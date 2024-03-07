import { jsonResponse } from '../../src/utils/jsonResponse';
import { COMPANY, noETA } from '../../src/constant';
import * as ServiceProvider from '../../src/class/serviceProviderForFunction';
import ValidationUtil from '../../src/utils/validateUtil';

export async function onRequestPost({ request, env }) {
    const requestBody = JSON.parse(await request.text());
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
            const company = Object.values(COMPANY).find((c) => c.CODE == requestItem.company);
            if (typeof ServiceProvider[company.CODE].fetchEta === 'function') {
                response.push(await ServiceProvider[company.CODE].fetchEta(requestItem, env));
            }
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
