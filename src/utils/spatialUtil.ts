import proj4 from 'proj4';
import { COORDINATE_DP } from '../constant';
proj4.defs(
    'EPSG:2326',
    '+proj=tmerc +lat_0=22.31213333333334 +lon_0=114.1785555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.959,-161.764,0.067753,-2.24365,-1.15883,-1.09425 +units=m +no_defs',
);
const EARTH_RADIUS_M = 6371000;

export default class SpatialUtil {
    /**
     * Convert coordinates from HK80 to WGS84
     * @param coordinates [long, lat]
     * @returns coordinates [lat, long]
     */
    static fromHK80ToWGS84(coordinates = []) {
        return proj4('EPSG:2326', 'EPSG:4326', coordinates)
            .map((coor) => parseFloat(coor.toFixed(COORDINATE_DP)))
            .reverse();
    }

    /**
     * Calculate distance of 2 point
     * @param point \{ lat, long }
     * @returns distance in meter
     */
    static haversine(a, b) {
        const lat1 = parseFloat(a.lat);
        const lon1 = parseFloat(a.long);
        const lat2 = parseFloat(b.lat);
        const lon2 = parseFloat(b.long);

        const dLat = SpatialUtil.toRad(lat2 - lat1);
        const dLon = SpatialUtil.toRad(lon2 - lon1);

        const rLat1 = SpatialUtil.toRad(lat1);
        const rLat2 = SpatialUtil.toRad(lat2);

        const h = Math.sin(dLat / 2) ** 2 + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) ** 2;

        return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
    }

    static toRad(deg) {
        return (deg * Math.PI) / 180;
    }
}
