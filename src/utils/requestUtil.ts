import fetch from 'node-fetch';
import logger from './logger';

export const doRequest = async (
    method: string,
    url: string,
    headers?: {},
    body?: any,
    bodyType = 'json',
    toString = false,
    timeout = 60000,
) => {
    let result;
    while (true) {
        let request;
        if (bodyType === 'json') {
            if (method == 'POST' && body != null) {
                request = fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...headers,
                    },
                    body: JSON.stringify(body),
                });
            } else {
                request = fetch(url, { method: method, headers: headers });
            }
        } else {
            if (method == 'POST' && body != null) {
                request = fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        ...headers,
                    },
                    body: body,
                });
            } else {
                request = fetch(url, { method: method, headers: headers });
            }
        }

        await Promise.all([request])
            .then(([response]) => {
                if (!response.ok) {
                    throw new Error('HTTP status code: ' + response.status);
                } else {
                    result = toString ? response.text() : response.json();
                }
            })
            .catch((err) => {
                logger.error(`Fail to call ${url} `, err.message);
            });

        if (result !== null && result !== undefined) return result;

        await new Promise((r) => setTimeout(r, timeout));
    }
};
