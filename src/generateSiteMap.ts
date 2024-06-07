import fs from 'fs';
import path from 'path';

import { COMPANY } from './constant';
import logger from './utils/logger';

const DOMAIN = 'https://siri-shortcut-hk-bus-eta.pages.dev/';
const routeFolder = path.join('public', 'api', 'route');
const sitemapFile = path.join('public', 'sitemap.txt');

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
            let url = '';
            switch(route.company) {
                case COMPANY.MTR_HR.CODE:
                   url = `${DOMAIN}${route.company}/${route.routeId}`;
                    break;
                case COMPANY.NLB.CODE:
                case COMPANY.GMB.CODE:
                    url = `${DOMAIN}${route.company}/${route.route}/${route.routeId}`;
                    break;
                default:
                    url = `${DOMAIN}${route.company}/${route.route}/${route.dir}`;
                    break;
            }
            //write string to sitemap.txt
            fs.appendFileSync(sitemapFile, `${url}\n`, 'utf8');
            count++;
        }
    }

    logger.info(`${count} routes added to sitemap.txt`);
    logger.info('End');
})();
