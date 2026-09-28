import * as turf from '@turf/turf';
import highwayData from './highwayData.json';

/**
 * 偵測路線行經的多條高速公路，並依巴士站分組為連續高速行駛區間
 * @param {Object} busSpatial - 巴士線 spatial json
 * @param {Array<{name: string, lat: number, long: number}>} stopPoints - 循序排列的巴士站
 * @param {number} thresholdMeters - 判定行經長度閾值 (預設 500 公尺)
 */
export function analyzeMultiHighwayRoute(busSpatial, stopPoints, thresholdMeters = 500) {
    const busLine = turf.lineString(busSpatial.flat(1).map((point) => [point[1], point[0]]));

    // 1. 將所有巴士站投影到路線上，計算沿線里程 (km)
    const stopsWithDist = stopPoints
        .map((stop, idx) => {
            const pt = turf.point([parseFloat(stop.long), parseFloat(stop.lat)]);
            const snapped = turf.nearestPointOnLine(busLine, pt, { units: 'kilometers' });
            return {
                index: idx,
                distKm: snapped.properties.location,
            };
        })
        .sort((a, b) => a.distKm - b.distKm);

    // 2. 逐一比對每條高速公路與巴士線的重疊區間
    const matchedRoads = [];
    const [bMinX, bMinY, bMaxX, bMaxY] = turf.bbox(busLine);

    for (const { name: hwName, threshold: highwayThreshold, spatial: coords } of highwayData) {
        if (!coords || coords.length < 2) continue;
        const highwayCoords = coords.map(([lat, long]) => [long, lat]);

        // BBox 粗篩
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
        for (const [x, y] of highwayCoords) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
        if (bMaxX < minX || bMinX > maxX || bMaxY < minY || bMinY > maxY) continue;

        const highwayLine = turf.lineString(highwayCoords);
        const hwBuffer = turf.buffer(highwayLine, 15, { units: 'meters' });
        if (!hwBuffer) continue;

        const splitResult = turf.lineSplit(busLine, turf.polygonToLine(hwBuffer));
        const testSegments = splitResult.features.length > 0 ? splitResult.features : [busLine];
        const overlapRuns = [];
        let currentRun = [];

        for (const seg of testSegments) {
            const mid = turf.along(seg, turf.length(seg) / 2);
            if (turf.booleanPointInPolygon(mid, hwBuffer)) {
                currentRun.push(seg);
            } else if (currentRun.length > 0) {
                overlapRuns.push(currentRun);
                currentRun = [];
            }
        }
        if (currentRun.length > 0) overlapRuns.push(currentRun);

        const qualifiedRuns = overlapRuns
            .map((segments) => ({
                segments,
                overlapMeters: segments.reduce(
                    (sum, segment) => sum + turf.length(segment, { units: 'kilometers' }) * 1000,
                    0,
                ),
            }))
            .filter((run) => run.overlapMeters >= (highwayThreshold ?? thresholdMeters));

        qualifiedRuns.forEach((run) => {
            const firstCoord = run.segments[0].geometry.coordinates[0];
            const entryDist = turf.nearestPointOnLine(busLine, turf.point(firstCoord), { units: 'kilometers' })
                .properties.location;

            // 找出公路入口前最近的巴士站 (容差 50m)
            const TOLERANCE_KM = 0.05;
            const beforeStops = stopsWithDist.filter((s) => s.distKm < entryDist - TOLERANCE_KM);

            matchedRoads.push({
                highway: hwName,
                stopBeforeIndex: beforeStops.length > 0 ? beforeStops[beforeStops.length - 1].index : -1,
                entryDist,
                overlapMeters: run.overlapMeters,
            });
        });
    }

    matchedRoads.sort((a, b) => a.entryDist - b.entryDist);

    const seenMatches = new Set();
    const distinctMatches = matchedRoads.filter((match) => {
        const key = JSON.stringify([match.highway, match.stopBeforeIndex]);
        if (seenMatches.has(key)) return false;
        seenMatches.add(key);
        return true;
    });

    return distinctMatches.map(({ highway, stopBeforeIndex, overlapMeters }) => {
        return { highway, stopBeforeIndex, overlapMeters };
    });
}

self.addEventListener('message', ({ data }) => {
    try {
        const result = analyzeMultiHighwayRoute(data.busSpatial, data.stopPoints, data.thresholdMeters);
        self.postMessage({ id: data.id, result });
    } catch (error) {
        self.postMessage({ id: data.id, error: error instanceof Error ? error.message : String(error) });
    }
});
