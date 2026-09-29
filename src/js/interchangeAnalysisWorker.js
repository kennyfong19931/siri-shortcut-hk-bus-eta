import * as turf from '@turf/turf';
import interchangeData from './interchangeData.json';

export function analyzeInterchangeData(stopPoints, company, thresholdMeters = 50) {
    const interchangeAreas = interchangeData
        .map(({ type, spatial }) => ({
            type,
            area: turf.buffer(turf.polygon(spatial), thresholdMeters, { units: 'meters' }),
        }))
        .filter(({ area }) => area);

    return stopPoints.map((stop) => {
        const point = turf.point([parseFloat(stop.long), parseFloat(stop.lat)]);
        const types = new Set();

        interchangeAreas.forEach(({ type, area }) => {
            if (turf.booleanPointInPolygon(point, area)) {
                type.forEach((interchangeType) => {
                    if (
                        !('mtr_hr' === company && 'mtr' === interchangeType) &&
                        !('mtr_lr' === company && 'lrt' === interchangeType)
                    ) {
                        types.add(interchangeType);
                    }
                });
            }
        });

        return [...types];
    });
}

self.addEventListener('message', ({ data }) => {
    try {
        const result = analyzeInterchangeData(data.stopPoints, data.company, data.thresholdMeters);
        self.postMessage({ id: data.id, result });
    } catch (error) {
        self.postMessage({ id: data.id, error: error instanceof Error ? error.message : String(error) });
    }
});