import dayjs from 'dayjs';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import xml from 'xml';

import logger from './utils/logger';

const DOMAIN = 'https://siri-shortcut-hk-bus-eta.pages.dev';
const routeFolder = path.join('public', 'api', 'route');
const sitemapFile = path.join('public', 'sitemap.xml');

function getRouteUrl(data) {
    if ('mtr_hr' === data.company) {
        return `/${data.company}/${data.routeId}`;
    } else if ('nlb' === data.company) {
        return `/${data.company}/${data.route}/${data.routeId}`;
    } else if ('gmb' === data.company) {
        return `/${data.company}/${data.route}/${data.routeType}`;
    } else {
        return `/${data.company}/${data.route}/${data.dir}`;
    }
}

async function getLastModify() {
    return new Promise((resolve, reject) => {
        exec(`git log --pretty=format:%ad --date=format-local:"Date:%Y-%m-%d" --name-only ${routeFolder}`, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Error executing command: ${error.message}`));
                return;
            }
            if (stderr) {
                reject(new Error(`Command stderr: ${stderr}`));
                return;
            }
            resolve(stdout);
        });
    }).then((stdout:string) => {
        let resultMap = new Map<string, string>();
        const lines = stdout.trim().split('\n');
        let currentDate = null;

        lines.forEach((line) => {
            if (line.includes('Date:')) {
                currentDate = line.replace('Date:', '').trim();
            } else {
                const match = line.match(/[\/\\](\w*\.json)/);
                const filename = match ? match[1] : '';
                if(filename !== '' && !resultMap.has(filename)) {
                    resultMap.set(filename, currentDate);
                }
            }
        });

        return resultMap;
    });
}

(async function () {
    logger.info('Start');
    const today = dayjs().format('YYYY-MM-DD');
    const fileLastModifiedAt = await getLastModify();
    let pageList = [];

    const files = fs.readdirSync(routeFolder);
    for (const file of files) {
        const filePath = path.join(routeFolder, file);
        const data = fs.readFileSync(filePath, 'utf8');
        const routeList = JSON.parse(data);
        for (let route of routeList) {
            pageList.push({ href: DOMAIN + getRouteUrl(route), srcFileLastModifiedAt: fileLastModifiedAt.has(file) ? fileLastModifiedAt.get(file) : today });
        }
    }

    const xmlObject = {
        urlset: [
            {
                _attr: {
                    xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
                },
            },
            ...pageList.map((page) => {
                return {
                    url: [
                        { loc: page.href },
                        { lastmod: page.srcFileLastModifiedAt },
                        { changefreq: 'daily' },
                        { priority: 0.5 },
                    ],
                };
            }),
        ],
    };

    const xmlString = xml(xmlObject);
    fs.writeFileSync(sitemapFile, '<?xml version="1.0" encoding="UTF-8"?>' + xmlString);

    logger.info(`${pageList.length} routes added to ${sitemapFile}`);
    logger.info('End');
})();
