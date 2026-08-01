type CompanyRouteInfo = {
    routeId: string;
    serviceType?: string;
    dir: string;
};

type JointStop = {
    gtfsId?: string;
    kmb: string;
    ctb: string;
};

export class JointRoute {
    private gtfsId?: string;
    private kmb: CompanyRouteInfo;
    private ctb: CompanyRouteInfo;
    private stopList: JointStop[];

    constructor(kmb: CompanyRouteInfo, ctb: CompanyRouteInfo, stopList: JointStop[], gtfsId?: string) {
        this.gtfsId = gtfsId;
        this.kmb = kmb;
        this.ctb = ctb;
        this.stopList = stopList || [];
    }

    public getGtfsId(): string | undefined {
        return this.gtfsId;
    }
    public setGtfsId(id?: string) {
        this.gtfsId = id;
    }

    public getKmb(): CompanyRouteInfo {
        return this.kmb;
    }
    public setKmb(info: CompanyRouteInfo) {
        this.kmb = info;
    }

    public getCtb(): CompanyRouteInfo {
        return this.ctb;
    }
    public setCtb(info: CompanyRouteInfo) {
        this.ctb = info;
    }

    public getStopList(): JointStop[] {
        return this.stopList;
    }
    public setStopList(stops: JointStop[]) {
        this.stopList = stops;
    }
}
