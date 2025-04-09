export class Stop {
    private id: string;
    private name: string;
    private nameEn: string;
    private lat: string;
    private long: string;
    private street: string;
    private streetEn: string;
    private fare: string;
    private fareHoliday: string;
    private railwayFilterDir: string; // stop is terminus, only allow to travel in this direction

    constructor(
        id: string,
        name: string,
        nameEn: string,
        lat: string,
        long: string,
        street?: string,
        streetEn?: string,
        fare?: string,
        fareHoliday?: string,
    ) {
        this.id = id;
        this.name = name;
        this.nameEn = nameEn;
        this.lat = lat;
        this.long = long;
        this.street = street;
        this.streetEn = streetEn;
        this.fare = fare;
        this.fareHoliday = fareHoliday;
    }

    public getId(): string {
        return this.id;
    }

    public getName(): string {
        return this.name;
    }

    public getNameEn(): string {
        return this.nameEn;
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

    public getStreetEn(): string {
        return this.streetEn;
    }

    public getFare(): string {
        return this.fare;
    }

    public getFareHoliday(): string {
        return this.fareHoliday;
    }

    public setRailwayFilterDir(railwayFilterDir: string) {
        this.railwayFilterDir = railwayFilterDir;
    }

    public getRailwayFilterDir() {
        return this.railwayFilterDir;
    }
}
