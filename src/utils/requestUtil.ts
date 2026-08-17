import https from 'node:https';
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
                    body: JSON.stringify(body.replace(/^\uFEFF/, '')),
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

export const getJointJson = () => require(`../../public/api/joint.json`);

export const telegramPost = async (body: any, commitHash: string) => {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    const TG_MESSAGE_LIMIT = 30000; // real limit of rich message is 32768 UTF-8 characters 

    if (body.length > TG_MESSAGE_LIMIT) {
        body = body.substring(0, body.length - 100) + `\n\n超出長度限制請到 🔗[Github](https://github.com/kennyfong19931/siri-shortcut-hk-bus-eta/commit/${commitHash}) 上查看`;
    }
    const data = JSON.stringify({
        chat_id: CHAT_ID,
        rich_message: {
            markdown: body,
        },
    });

    const req = https.request(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendRichMessage`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
            },
        },
        (res) => {
            let responseBody = '';

            res.on('data', (chunk) => {
                responseBody += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    logger.info('Telegram notification sent successfully!');
                } else {
                    logger.error(`Telegram API Error [${res.statusCode}]: ${responseBody}`, undefined);
                }
            });
        },
    );

    req.on('error', (e) => {
        logger.error(`HTTPS Network Error: ${e.message}`, e);
    });
    req.write(data);
    req.end();
};
