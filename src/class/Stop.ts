export class Stop {
    private id: string;
    private name: string;
    private lat: string;
    private long: string;
    private street: string;
    private fare: string;
    private fareHoliday: string;

    constructor(id: string, name: string, lat: string, long: string, street?: string, fare?: string, fareHoliday?: string) {
        this.id = id;
        this.name = name;
        this.lat = lat;
        this.long = long;
        this.street = street;
        this.fare = fare;
        this.fareHoliday = fareHoliday;
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
        return this.fare
    }

    public getFareHoliday(): string {
        return this.fareHoliday
    }
}
