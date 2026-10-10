export type GtfsFareRecord =
    | { gtfsId: string; stopList: Array<{ fare: number; stopId: string }> }
    | {
          gtfsId: string;
          stopList: Array<{ fare: number; boardingStopId: string; dropOffStopId: string }>;
          twoWay: true;
      };

type FarePair = { originSequence: number; destinationSequence: number; fare: number; stopIds: [string, string] };

export function createGtfsFareData(
    fareAttributes: Record<string, string>[],
    trips: Record<string, string>[],
    stopTimes: Record<string, string>[],
): GtfsFareRecord[] {
    const representativeTripByGtfsId = new Map<string, string>();
    for (const trip of trips) {
        const parts = trip.trip_id?.split('-') ?? [];
        if (parts.length >= 2) {
            const gtfsId = `${parts[0]}_${parts[1]}`;
            if (!representativeTripByGtfsId.has(gtfsId)) {
                representativeTripByGtfsId.set(gtfsId, trip.trip_id);
            }
        }
    }

    const stopIdsByGtfsId = new Map<string, Map<number, string>>();
    const gtfsIdByTripId = new Map(Array.from(representativeTripByGtfsId, ([gtfsId, tripId]) => [tripId, gtfsId]));
    for (const stopTime of stopTimes) {
        const gtfsId = gtfsIdByTripId.get(stopTime.trip_id);
        const sequence = Number(stopTime.stop_sequence);
        if (!gtfsId || !stopTime.stop_id || !Number.isInteger(sequence)) continue;
        const routeStops = stopIdsByGtfsId.get(gtfsId) ?? new Map<number, string>();
        routeStops.set(sequence, stopTime.stop_id);
        stopIdsByGtfsId.set(gtfsId, routeStops);
    }

    const farePairsByGtfsId = new Map<string, FarePair[]>();
    for (const fareAttribute of fareAttributes) {
        const fareParts = fareAttribute.fare_id?.split('-') ?? [];
        const fare = Number(fareAttribute.price);
        if (fareParts.length !== 4 || !Number.isFinite(fare)) continue;

        const gtfsId = `${fareParts[0]}_${fareParts[1]}`;
        const routeStops = stopIdsByGtfsId.get(gtfsId);
        const originSequence = Number(fareParts[2]);
        const destinationSequence = Number(fareParts[3]);
        const originStopId = routeStops?.get(originSequence);
        const destinationStopId = routeStops?.get(destinationSequence);
        if (!originStopId || !destinationStopId) continue;

        const farePairs = farePairsByGtfsId.get(gtfsId) ?? [];
        farePairs.push({
            originSequence,
            destinationSequence,
            fare,
            stopIds: [originStopId, destinationStopId],
        });
        farePairsByGtfsId.set(gtfsId, farePairs);
    }

    const fareData: GtfsFareRecord[] = [];
    for (const [gtfsId, farePairs] of farePairsByGtfsId) {
        const faresByBoardingSequence = new Map<number, FarePair[]>();
        for (const pair of farePairs) {
            const pairsForBoardingStop = faresByBoardingSequence.get(pair.originSequence) ?? [];
            pairsForBoardingStop.push(pair);
            faresByBoardingSequence.set(pair.originSequence, pairsForBoardingStop);
        }

        const isBoardingSectionFare = Array.from(faresByBoardingSequence.values()).every(
            (pairs) => new Set(pairs.map((pair) => pair.fare)).size === 1,
        );
        if (isBoardingSectionFare) {
            const stopList: Array<{ fare: number; stopId: string }> = [];
            let previousFare: number | undefined;
            for (const [sequence, pairs] of [...faresByBoardingSequence].sort(([a], [b]) => a - b)) {
                const fare = pairs[0].fare;
                if (fare !== previousFare) {
                    const stopId = stopIdsByGtfsId.get(gtfsId)?.get(sequence);
                    if (stopId) stopList.push({ fare, stopId });
                }
                previousFare = fare;
            }
            if (stopList.length > 0) {
                fareData.push({ gtfsId, stopList });
            }
            continue;
        }

        const twoWayStopList: Array<{ fare: number; boardingStopId: string; dropOffStopId: string }> = [];
        let previousFareProfile = '';
        for (const [, boardingPairs] of [...faresByBoardingSequence].sort(([a], [b]) => a - b)) {
            boardingPairs.sort((a, b) => a.destinationSequence - b.destinationSequence);
            const fareRangeEnds: FarePair[] = [];
            let previousPair = boardingPairs[0];
            for (const pair of boardingPairs.slice(1)) {
                if (
                    pair.fare !== previousPair.fare ||
                    pair.destinationSequence !== previousPair.destinationSequence + 1
                ) {
                    fareRangeEnds.push(previousPair);
                }
                previousPair = pair;
            }
            fareRangeEnds.push(previousPair);

            const fareProfile = JSON.stringify(
                fareRangeEnds.map(({ fare, destinationSequence }) => [fare, destinationSequence]),
            );
            if (fareProfile === previousFareProfile) continue;
            previousFareProfile = fareProfile;

            fareRangeEnds.forEach((rangeEnd) => {
                twoWayStopList.push({
                    fare: rangeEnd.fare,
                    boardingStopId: rangeEnd.stopIds[0],
                    dropOffStopId: rangeEnd.stopIds[1],
                });
            });
        }
        if (twoWayStopList.length > 0) {
            fareData.push({ gtfsId, stopList: twoWayStopList, twoWay: true });
        }
    }

    return fareData.sort((a, b) => a.gtfsId.localeCompare(b.gtfsId) || Number('twoWay' in a) - Number('twoWay' in b));
}
