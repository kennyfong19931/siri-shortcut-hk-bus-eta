import * as turf from '@turf/turf';
import interchangeData from './interchangeData.json';

export function analyzeInterchangeData(stopPoints, company, thresholdMeters = 50) {
    const interchangeAreas = interchangeData
        .map(({ name, type, spatial }) => ({
            name,
            type,
            polygon: turf.polygon(spatial),
        }))
        .map((area) => ({
            ...area,
            boundaryLines: turf.flatten(turf.polygonToLine(area.polygon)).features,
        }));

    return stopPoints.map((stop) => {
        const point = turf.point([parseFloat(stop.long), parseFloat(stop.lat)]);
        const types = new Set();

        interchangeAreas.forEach(({ name, type, polygon, boundaryLines }) => {
            const withinThreshold = type.includes('bus')
                ? false
                : boundaryLines.some(
                      (line) => turf.pointToLineDistance(point, line, { units: 'meters' }) <= thresholdMeters,
                  );
            if (turf.booleanPointInPolygon(point, polygon) || withinThreshold) {
                type.forEach((interchangeType) => {
                    if (
                        !('mtr_hr' === company && 'mtr' === interchangeType) &&
                        !('mtr_lr' === company && 'lrt' === interchangeType)
                    ) {
                        types.add({ name, type: interchangeType });
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
        console.error(error);
        self.postMessage({ id: data.id, error: error instanceof Error ? error.message : String(error) });
    }
});
