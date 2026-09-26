import fs from 'fs';
import path from 'path';

import logger from './utils/logger';
import SpatialUtil from './utils/spatialUtil';

const highwayPath = path.join('src', 'js', 'highwayData.json');
import { COORDINATE_DP } from './constant';
const name = '屯門公路';
const input = {};
// get input as GeoJson from https://overpass-turbo.eu/ 
// query = "[out:json][timeout:25];nw["name:en"="Road Name"]({{bbox}});out geom;"

(async function () {
    logger.info('Start');
    const highwayData = JSON.parse(fs.readFileSync(highwayPath, 'utf8'));
    const inputSpatial = input.features.flatMap(({ geometry }) =>
      geometry.coordinates.map(([longitude, latitude]) => [
        parseFloat(latitude.toFixed(COORDINATE_DP)),
        parseFloat(longitude.toFixed(COORDINATE_DP)),
      ]),
    );
    const roadData = SpatialUtil.removeDuplicateSubArrays(inputSpatial);
    highwayData[name] = roadData;
    logger.info(`Added to ${name} to highway.json`);
    fs.writeFileSync(highwayPath, JSON.stringify(highwayData));
    logger.info('End');
})();
