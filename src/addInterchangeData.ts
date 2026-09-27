import fs from 'fs';
import path from 'path';

import logger from './utils/logger';

const interchangePath = path.join('src', 'js', 'interchangeData.json');
const name = '';
const type = ['']; // bus, mtr, lrt
const input = {};
// get input as GeoJson from https://overpass-turbo.eu/
// query = "[bbox:{{bbox}}][out:json][timeout:25];way(wayId);out geom;"

(async function () {
    logger.info('Start');
    const interchangeData = JSON.parse(fs.readFileSync(interchangePath, 'utf8'));
    const inputSpatial = input.features[0].geometry.coordinates;
    interchangeData.push({
        name,
        type,
        spatial: inputSpatial,
    });
    logger.info(`Added to ${name} to interchangeData.json`);
    fs.writeFileSync(interchangePath, JSON.stringify(interchangeData));
    logger.info('End');
})();
