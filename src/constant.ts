export const PLACEHOLDER = {
    COMPANY: '{{company_id}}',
    ROUTE: '{{route}}',
    ROUTE_TYPE: '{{route_type}}',
    STOP: '{{stop_id}}',
    DIRECTION: '{{direction}}',
    REGION: '{{region}}',
};
export const COMPANY = {
    KMB: {
        CODE: 'kmb',
        ETA_API: `https://data.etabus.gov.hk/v1/transport/kmb/eta/${PLACEHOLDER.STOP}/${PLACEHOLDER.ROUTE}/${PLACEHOLDER.ROUTE_TYPE}`,
        ROUTE_API: `https://data.etabus.gov.hk/v1/transport/kmb/route`,
        STOP_API: `https://data.etabus.gov.hk/v1/transport/kmb/stop`,
        ROUTE_STOP_API: `https://data.etabus.gov.hk/v1/transport/kmb/route-stop`,
    },
    CTB: {
        CODE: 'ctb',
        ETA_API: `https://rt.data.gov.hk/v2/transport/citybus/eta/${PLACEHOLDER.COMPANY}/${PLACEHOLDER.STOP}/${PLACEHOLDER.ROUTE}`,
        ROUTE_API: `https://rt.data.gov.hk/v2/transport/citybus/route/${PLACEHOLDER.COMPANY}`,
        STOP_API: `https://rt.data.gov.hk/v2/transport/citybus/stop/${PLACEHOLDER.STOP}`,
        ROUTE_STOP_API: `https://rt.data.gov.hk/v2/transport/citybus/route-stop/${PLACEHOLDER.COMPANY}/${PLACEHOLDER.ROUTE}/${PLACEHOLDER.DIRECTION}`,
    },
    NWFB: {
        CODE: 'nwfb',
        ETA_API: `https://rt.data.gov.hk/v2/transport/citybus/eta/ctb/${PLACEHOLDER.STOP}/${PLACEHOLDER.ROUTE}`,
        ROUTE_API: `https://rt.data.gov.hk/v2/transport/citybus/route/ctb}`,
        STOP_API: `https://rt.data.gov.hk/v2/transport/citybus/stop/${PLACEHOLDER.STOP}`,
        ROUTE_STOP_API: `https://rt.data.gov.hk/v2/transport/citybus/route-stop/ctb/${PLACEHOLDER.ROUTE}/${PLACEHOLDER.DIRECTION}`,
    },
    NLB: {
        CODE: 'nlb',
        ETA_API: `https://rt.data.gov.hk/v2/transport/nlb/stop.php?action=estimatedArrivals&routeId=${PLACEHOLDER.ROUTE}&stopId=${PLACEHOLDER.STOP}&language=zh`,
        ROUTE_API: `https://rt.data.gov.hk/v2/transport/nlb/route.php?action=list`,
        STOP_API: null,
        ROUTE_STOP_API: `https://rt.data.gov.hk/v2/transport/nlb/stop.php?action=list&routeId=${PLACEHOLDER.ROUTE}`,
    },
    GMB: {
        CODE: 'gmb',
        ETA_API: `https://data.etagmb.gov.hk/eta/route-stop/${PLACEHOLDER.ROUTE}/${PLACEHOLDER.STOP}`,
        ALL_ROUTE_API: `https://data.etagmb.gov.hk/route`,
        ROUTE_API: `https://data.etagmb.gov.hk/route/${PLACEHOLDER.REGION}/${PLACEHOLDER.ROUTE}`,
        STOP_API: `https://data.etagmb.gov.hk/stop/${PLACEHOLDER.STOP}`,
        ROUTE_STOP_API: `https://data.etagmb.gov.hk/route-stop/${PLACEHOLDER.ROUTE}/${PLACEHOLDER.ROUTE_TYPE}`,
        STOP_LAST_UPDATE_API: 'https://data.etagmb.gov.hk/last-update/stop',
    },
    MTR: {
        CODE: 'mtr',
        ETA_API: `https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule`,
        ROUTE_API: `https://opendata.mtr.com.hk/data/mtr_bus_routes.csv`,
        STOP_API: null,
        ROUTE_STOP_API: `https://opendata.mtr.com.hk/data/mtr_bus_stops.csv`,
    },
    MTR_HR: {
        CODE: 'mtr_hr',
        ETA_API: `https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${PLACEHOLDER.ROUTE}&sta=${PLACEHOLDER.STOP}&lang=tc`,
        ROUTE_API: `https://opendata.mtr.com.hk/data/mtr_lines_and_stations.csv`,
        STOP_API: null,
        ROUTE_STOP_API: null,
    },
    MTR_LR: {
        CODE: 'mtr_lr',
        ETA_API: `https://rt.data.gov.hk/v1/transport/mtr/lrt/getSchedule?station_id=${PLACEHOLDER.STOP}`,
        ROUTE_API: `https://opendata.mtr.com.hk/data/light_rail_routes_and_stops.csv`,
        STOP_API: null,
        ROUTE_STOP_API: null,
    },
};
export const noETA = [{ eta: null, remark: '未有資料' }];
