import { Stop } from './Stop';

export class Route {
    private company: string;
    private route: string;
    private routeEn: string;
    private routeType: string;
    private dir: string;
    private orig: string;
    private origEn: string;
    private dest: string;
    private destEn: string;
    private stopList: Array<Stop>;
    private routeId: string; // for NLB, GMB
    private description: string;
    private descriptionEn: string;

    constructor(
        company: string,
        route: string,
        routeEn: string,
        routeType: string,
        dir: string,
        orig: string,
        origEn: string,
        dest: string,
        destEn: string,
        stopList: Array<Stop>,
        routeId?: string,
        description?: string,
        descriptionEn?: string,
    ) {
        this.company = company;
        this.route = route;
        this.routeEn = routeEn;
        this.routeType = routeType;
        this.dir = dir;
        this.orig = orig;
        this.origEn = origEn;
        this.dest = dest;
        this.destEn = destEn;
        this.stopList = stopList;
        if (routeId === undefined) {
            this.routeId = route;
        } else {
            this.routeId = routeId;
        }
        if (description === undefined) {
            this.description = '正常班次';
        } else {
            this.description = description;
        }
        if (descriptionEn === undefined) {
            this.descriptionEn = 'Regular';
        } else {
            this.descriptionEn = descriptionEn;
        }
    }

    public getCompany(): string {
        return this.company;
    }

    public getRoute(): string {
        return this.route;
    }

    public getRouteEn(): string {
        return this.routeEn;
    }

    public getRouteType(): string {
        return this.routeType;
    }

    public getDir(): string {
        return this.dir;
    }

    public getOrig(): string {
        return this.orig;
    }

    public getOrigEn(): string {
        return this.origEn;
    }

    public getDest(): string {
        return this.dest;
    }

    public getDestEn(): string {
        return this.destEn;
    }

    public getStopList(): Array<Stop> {
        return this.stopList;
    }

    public getRouteId(): string {
        return this.routeId;
    }

    public setRouteId(routeId: string): void {
        this.routeId = routeId;
    }

    public getDescription(): string {
        return this.description;
    }

    public getDescriptionEn(): string {
        return this.descriptionEn;
    }
}
