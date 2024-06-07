import fs from 'fs';
import path from 'path';

import logger from './utils/logger';

const DOMAIN = 'https://siri-shortcut-hk-bus-eta.pages.dev';
const routeFolder = path.join('public', 'api', 'route');
const sitemapFile = path.join('public', 'sitemap.txt');

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

(async function () {
    logger.info('Start');
    let count = 0;
    fs.writeFileSync(sitemapFile, '', 'utf8');

    const files = fs.readdirSync(routeFolder);
    for (const file of files) {
        const filePath = path.join(routeFolder, file);
        const data = fs.readFileSync(filePath, 'utf8');
        const routeList = JSON.parse(data);
        for (let route of routeList) {
            fs.appendFileSync(sitemapFile, `${DOMAIN}${getRouteUrl(route)}\n`, 'utf8');
            count++;
        }
    }

    logger.info(`${count} routes added to sitemap.txt`);
    logger.info('End');
})();
