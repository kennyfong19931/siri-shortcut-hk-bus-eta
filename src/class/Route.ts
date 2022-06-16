import { Stop } from "./Stop";

export class Route {
    private company: string;
    private route: string;
    private routeType: string;
    private dir: string;
    private orig: string;
    private dest: string;
    private stopList: Array<Stop>;
    private routeId: string;    // for NLB, GMB
    private description: string;

    constructor(company: string, route: string, routeType: string, dir: string, orig: string, dest: string, stopList: Array<Stop>, routeId?: string, description?: string) {
        this.company = company;
        this.route = route;
        this.routeType = routeType;
        this.dir = dir;
        this.orig = orig;
        this.dest = dest;
        this.stopList = stopList;
        if (routeId === undefined) {
            this.routeId = route;
        } else {
            this.routeId = routeId;
        }
        if (routeId === undefined) {
            this.description = "正常班次";
        } else {
            this.description = description;
        }
    }

    public getCompany(): string {
        return this.company;
    }

    public getRoute(): string {
        return this.route;
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

    public getDest(): string {
        return this.dest;
    }

    public getStopList(): Array<Stop> {
        return this.stopList;
    }

    public getRouteId(): string {
        return this.routeId;
    }

    public setRouteId(routeId: string): void {
        this.routeId = routeId
    }

    public getDescription(): string {
        return this.description;
    }
}
