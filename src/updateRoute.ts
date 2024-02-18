import fs from 'fs';
import path from 'path';

import { COMPANY } from './constant';
import { Route } from './class/Route';
import * as ServiceProvider from './class/serviceProvider';
import logger from './utils/logger';

const outputFolder = path.join('public', 'api', 'route');

const getRoute = async (companyCode: string) => {
    logger.info(`Step 1: Get route data, company: ${companyCode}`);
    try {
        const company = Object.values(COMPANY).find((c) => c.CODE == companyCode);
        if (typeof ServiceProvider[company.CODE].crawlRoute === 'function') {
            return ServiceProvider[company.CODE].crawlRoute();
        }
        return null;
    } catch (err) {
        logger.error(`[getRoute]`, err);
    }
};

const addToMap = (map: Map<string, Array<Route>>, routeList: Array<Route>) => {
    if (routeList) {
        routeList.forEach((route: Route) => {
            let value = map.has(route.getRoute()) ? map.get(route.getRoute()) : [];
            value.push(route);
            map.set(route.getRoute(), value);
        });
    }
};

(async function () {
    logger.info('Start');
    await Promise.all([
        getRoute(COMPANY.KMB.CODE),
        getRoute(COMPANY.CTB.CODE),
        getRoute(COMPANY.NLB.CODE),
        getRoute(COMPANY.GMB.CODE),
        getRoute(COMPANY.MTR.CODE),
        getRoute(COMPANY.MTR_HR.CODE),
        getRoute(COMPANY.MTR_LR.CODE),
    ]).then(([kmb, ctb, nlb, gmb, mtr, mtrHr, mtrLr]) => {
        logger.info(`Step 2: Merge by route`);
        const routeMap = new Map();
        addToMap(routeMap, kmb);
        addToMap(routeMap, ctb);
        addToMap(routeMap, nlb);
        addToMap(routeMap, gmb);
        addToMap(routeMap, mtr);
        addToMap(routeMap, mtrLr);
        logger.info(`route count: ${routeMap.size}`);

        logger.info(`Step 3: Save result to JSON file`);
        if (fs.existsSync(outputFolder)) {
            fs.rmSync(outputFolder, { recursive: true });
        }
        fs.mkdirSync(outputFolder);

        routeMap.forEach((value, key) => {
            let filename = path.join(outputFolder, key + '.json');
            let data = JSON.stringify(value);
            fs.writeFileSync(filename, data);
        });

        logger.info('Step 4: Create JSON file for MTR_HR');
        if (mtrHr) {
            let filename = path.join(outputFolder, 'mtr_hr.json');
            let data = JSON.stringify(mtrHr);
            fs.writeFileSync(filename, data);
        }
    });
    logger.info('End');
})();
