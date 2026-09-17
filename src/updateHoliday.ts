import fs from 'fs';
import path from 'path';

import logger from './utils/logger';

const outputPath = path.join('src', 'js', 'holiday.json');

(async function () {
    logger.info('Start');
    const holiday = await fetch('https://www.1823.gov.hk/common/ical/tc.json', {
        method: 'GET',
    })
        .then((response) => response.json())
        .then((json) =>
            json.vcalendar[0].vevent.map((e) => {
                const s = e.dtstart[0];
                return s.substr(0, 4) + '-' + s.substr(4, 2) + '-' + s.substr(6, 2);
            }),
        )
        .catch((error) => {
            console.error(error);
            return [];
        });

    fs.writeFileSync(outputPath, JSON.stringify(holiday));
    logger.info('End');
})();
