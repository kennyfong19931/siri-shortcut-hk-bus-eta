export const PLACEHOLDER = {
    COMPANY: "{{company_id}}",
    ROUTE: "{{route}}",
    ROUTE_TYPE: "{{route_type}}",
    STOP: "{{stop_id}}",
    DIRECTION: "{{direction}}",
    REGION: "{{region}}",
};
export const COMPANY = {
    KMB: {
        CODE: "kmb",
        ETA_API: `https://data.etabus.gov.hk/v1/transport/kmb/eta/${PLACEHOLDER.STOP}/${PLACEHOLDER.ROUTE}/${PLACEHOLDER.ROUTE_TYPE}`,
        ROUTE_API: `https://data.etabus.gov.hk/v1/transport/kmb/route`,
        STOP_API: `https://data.etabus.gov.hk/v1/transport/kmb/stop`,
        ROUTE_STOP_API: `https://data.etabus.gov.hk/v1/transport/kmb/route-stop`,
    },
    CTB:  {
        CODE: "ctb",
        ETA_API: `https://rt.data.gov.hk/v1.1/transport/citybus-nwfb/eta/${PLACEHOLDER.COMPANY}/${PLACEHOLDER.STOP}/${PLACEHOLDER.ROUTE}`,
        ROUTE_API: `https://rt.data.gov.hk/v1.1/transport/citybus-nwfb/route/${PLACEHOLDER.COMPANY}`,
        STOP_API: `https://rt.data.gov.hk/v1.1/transport/citybus-nwfb/stop/${PLACEHOLDER.STOP}`,
        ROUTE_STOP_API: `https://rt.data.gov.hk/v1.1/transport/citybus-nwfb/route-stop/${PLACEHOLDER.COMPANY}/${PLACEHOLDER.ROUTE}/${PLACEHOLDER.DIRECTION}`,
    },
    NWFB:  {
        CODE: "nwfb",
        ETA_API: `https://rt.data.gov.hk/v1.1/transport/citybus-nwfb/eta/${PLACEHOLDER.COMPANY}/${PLACEHOLDER.STOP}/${PLACEHOLDER.ROUTE}`,
        ROUTE_API: `https://rt.data.gov.hk/v1.1/transport/citybus-nwfb/route/${PLACEHOLDER.COMPANY}`,
        STOP_API: `https://rt.data.gov.hk/v1.1/transport/citybus-nwfb/stop/${PLACEHOLDER.STOP}`,
        ROUTE_STOP_API: `https://rt.data.gov.hk/v1.1/transport/citybus-nwfb/route-stop/${PLACEHOLDER.COMPANY}/${PLACEHOLDER.ROUTE}/${PLACEHOLDER.DIRECTION}`,
    },
    NLB:  {
        CODE: "nlb",
        ETA_API: `https://rt.data.gov.hk/v1/transport/nlb/stop.php?action=estimatedArrivals`,
        ROUTE_API: `https://rt.data.gov.hk/v1/transport/nlb/route.php?action=list`,
        STOP_API: null,
        ROUTE_STOP_API: `https://rt.data.gov.hk/v1/transport/nlb/stop.php?action=list`,
    },
    GMB:  {
        CODE: "gmb",
        ETA_API: `https://data.etagmb.gov.hk/eta/route-stop/${PLACEHOLDER.ROUTE}/${PLACEHOLDER.ROUTE_TYPE}/${PLACEHOLDER.STOP}`,
        ALL_ROUTE_API: `https://data.etagmb.gov.hk/route`,
        ROUTE_API: `https://data.etagmb.gov.hk/route/${PLACEHOLDER.REGION}/${PLACEHOLDER.ROUTE}`,
        STOP_API: `https://data.etagmb.gov.hk/stop/${PLACEHOLDER.STOP}`,
        ROUTE_STOP_API: `https://data.etagmb.gov.hk/route-stop/${PLACEHOLDER.ROUTE}/${PLACEHOLDER.ROUTE_TYPE}`,
    },
    MTR:  {
        CODE: "mtr",
        ETA_API: `https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule`,
        ROUTE_API: `https://opendata.mtr.com.hk/data/mtr_bus_routes.csv`,
        STOP_API: null,
        ROUTE_STOP_API: `https://opendata.mtr.com.hk/data/mtr_bus_stops.csv`,
    },
};