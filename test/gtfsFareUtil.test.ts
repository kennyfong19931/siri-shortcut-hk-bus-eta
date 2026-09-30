import { createGtfsFareData } from '../src/utils/gtfsFareUtil';

describe('createGtfsFareData', () => {
    it('classifies boarding-only fares and preserves two-way matrix bands', () => {
        const result = createGtfsFareData(
            [
                { fare_id: '1001-1-1-2', price: '10' },
                { fare_id: '1001-1-1-3', price: '10' },
                { fare_id: '1001-1-1-4', price: '10' },
                { fare_id: '1001-1-2-3', price: '7' },
                { fare_id: '1001-1-2-4', price: '7' },
                { fare_id: '1001-1-3-4', price: '7' },
                { fare_id: '1002-1-1-2', price: '6' },
                { fare_id: '1002-1-1-3', price: '10' },
                { fare_id: '1002-1-2-3', price: '7' },
                { fare_id: '1003-1-1-3', price: '3.8' },
                { fare_id: '1003-1-1-4', price: '6.4' },
                { fare_id: '1003-1-1-5', price: '11.4' },
                { fare_id: '1003-1-2-3', price: '3.8' },
                { fare_id: '1003-1-2-4', price: '6.4' },
                { fare_id: '1003-1-2-5', price: '11.4' },
                { fare_id: '1003-1-3-4', price: '6.4' },
                { fare_id: '1003-1-3-5', price: '11.4' },
                { fare_id: '1003-1-4-5', price: '10.4' },
            ],
            [
                { trip_id: '1001-1-287-0535' },
                { trip_id: '1002-1-123-0535' },
                { trip_id: '1003-1-123-0535' },
            ],
            [
                ...[1, 2, 3, 4].map((sequence) => ({
                    trip_id: '1001-1-287-0535',
                    stop_id: `400${sequence}`,
                    stop_sequence: String(sequence),
                })),
                ...[1, 2, 3].map((sequence) => ({
                    trip_id: '1002-1-123-0535',
                    stop_id: `500${sequence}`,
                    stop_sequence: String(sequence),
                })),
                ...[1, 2, 3, 4, 5].map((sequence) => ({
                    trip_id: '1003-1-123-0535',
                    stop_id: `600${sequence}`,
                    stop_sequence: String(sequence),
                })),
            ],
        );

        expect(result).toEqual([
            { gtfsId: '1001_1', stopList: [{ fare: 10, stopId: '4001' }, { fare: 7, stopId: '4002' }] },
            {
                gtfsId: '1002_1',
                stopList: [
                    { fare: 6, boardingStopId: '5001', dropOffStopId: '5002' },
                    { fare: 10, boardingStopId: '5001', dropOffStopId: '5003' },
                    { fare: 7, boardingStopId: '5002', dropOffStopId: '5003' },
                ],
                twoWay: true,
            },
            {
                gtfsId: '1003_1',
                stopList: [
                    { fare: 3.8, boardingStopId: '6001', dropOffStopId: '6003' },
                    { fare: 6.4, boardingStopId: '6001', dropOffStopId: '6004' },
                    { fare: 11.4, boardingStopId: '6001', dropOffStopId: '6005' },
                    { fare: 6.4, boardingStopId: '6003', dropOffStopId: '6004' },
                    { fare: 11.4, boardingStopId: '6003', dropOffStopId: '6005' },
                    { fare: 10.4, boardingStopId: '6004', dropOffStopId: '6005' },
                ],
                twoWay: true,
            },
        ]);

        expect(new Set(result.map((record) => record.gtfsId)).size).toBe(result.length);
        const stopOrder = ['5001', '5002', '5003'];
        const twoWayRecord = result.find((record) => 'twoWay' in record);
        const lastDropOffByBoardingStop = new Map<string, number>();
        const expandedTwoWayPairs = twoWayRecord.stopList.flatMap(({ fare, boardingStopId, dropOffStopId }) => {
            const boardingIndex = stopOrder.indexOf(boardingStopId);
            const lastDropOffIndex = stopOrder.indexOf(dropOffStopId);
            const firstDropOffIndex = (lastDropOffByBoardingStop.get(boardingStopId) ?? boardingIndex) + 1;
            lastDropOffByBoardingStop.set(boardingStopId, lastDropOffIndex);
            return stopOrder
                .slice(firstDropOffIndex, lastDropOffIndex + 1)
                .map((expandedDropOffStopId) => [boardingStopId, expandedDropOffStopId, fare]);
        });
        expect(expandedTwoWayPairs).toEqual([
            ['5001', '5002', 6],
            ['5001', '5003', 10],
            ['5002', '5003', 7],
        ]);
    });
});