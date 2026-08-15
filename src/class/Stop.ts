import { parse } from 'path';
import { COORDINATE_DP } from '../constant';
export class Stop {
    private id: string;
    private name: string;
    private lat: string;
    private long: string;
    private street: string;
    private fare: string;
    private fareHoliday: string;
    private gtfsId: string;
    private railwayFilterDir: string; // stop is terminus, only allow to travel in this direction
    private ctbDir: string; // for mergeRoute

    constructor(
        id: string,
        name: string,
        lat: string,
        long: string,
        street?: string,
        fare?: string,
        fareHoliday?: string,
        gtfsId?: string,
    ) {
        this.id = id;
        this.name = name;
        this.lat = parseFloat(lat).toFixed(COORDINATE_DP);
        this.long = parseFloat(long).toFixed(COORDINATE_DP);
        this.street = street;
        this.fare = fare;
        this.fareHoliday = fareHoliday;
        this.gtfsId = gtfsId;
    }

    public getId(): string {
        return this.id;
    }

    public getName(): string {
        return this.name;
    }

    public getLat(): string {
        return this.lat;
    }

    public getLong(): string {
        return this.long;
    }

    public getStreet(): string {
        return this.street;
    }

    public getFare(): string {
        return this.fare;
    }

    public getFareHoliday(): string {
        return this.fareHoliday;
    }

    public setGtfsId(gtfsId: string): void {
        this.gtfsId = gtfsId;
    }

    public getGtfsId(): string {
        return this.gtfsId;
    }

    public setRailwayFilterDir(railwayFilterDir: string) {
        this.railwayFilterDir = railwayFilterDir;
    }

    public getRailwayFilterDir() {
        return this.railwayFilterDir;
    }

    public setCtbDir(ctbDir: string): void {
        this.ctbDir = ctbDir;
    }

    public getCtbDir(): string {
        return this.ctbDir;
    }
}
