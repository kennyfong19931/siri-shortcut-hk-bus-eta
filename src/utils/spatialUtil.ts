import proj4 from 'proj4';
proj4.defs(
    'EPSG:2326',
    '+proj=tmerc +lat_0=22.31213333333334 +lon_0=114.1785555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.959,-161.764,0.067753,-2.24365,-1.15883,-1.09425 +units=m +no_defs',
);

export default class SpatialUtil {
    static fromHK80ToWGS84(coordinates = []) {
        return proj4('EPSG:2326', 'EPSG:4326', coordinates)
            .map((coor) => parseFloat(coor.toFixed(5)))
            .reverse();
    }
}
