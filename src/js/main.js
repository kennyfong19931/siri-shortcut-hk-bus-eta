import '../scss/styles.scss';
import Offcanvas from 'bootstrap/js/src/offcanvas';
import {
    utf8_to_b64,
    b64_to_utf8,
    getCompanyImage,
    getCompanyColor,
    getHtmlTemplate,
    getPageWidth,
    getMtrColor,
    getMtrTextColor,
} from './util.js';

const ROUTE_API = `${BASE_API}/api/route/{route}.json`;
const SPATIAL_API = `${BASE_API}/api/spatial/{path}.json`;
const ETA_API = `${BASE_API}/api/eta`;
const SIRI_SHORTCUT_UPDATE_API = `${BASE_API}/update.json`;
const searchAlert = document.getElementById('searchAlert');
const searchResult = document.getElementById('searchResult');
const searchDrawer = new Offcanvas('#searchDrawer');
const topographicMapAPI = 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/basemap/wgs84/{z}/{x}/{y}.png';
const imageryMapAPI = 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/imagery/wgs84/{z}/{x}/{y}.png';
const labelAPI = 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/label/hk/tc/wgs84/{z}/{x}/{y}.png';
const attributionInfo =
    '<a target="_blank" href="https://portal.csdi.gov.hk/">&copy; 地圖版權屬香港特區政府</a><img style="width:16px;height:16px;" src="https://api.hkmapservice.gov.hk/mapapi/landsdlogo.jpg" />';
const antPathOption = {
    delay: 400,
    dashArray: [20, 40],
    weight: 5,
    paused: false,
    reverse: false,
    hardwareAccelerated: true,
};
const defaultPopupContent = '<span class="loader m-3"></span>';
const defaultPopupOption = { className: 'etaPopup', maxWidth: getPageWidth() };
let mtrHrData;

// functions
const alert = (message, type) => {
    let html = `<div class="alert alert-${type}" role="alert"><div>${message}</div></div>`;
    searchAlert.innerHTML += html;
};
const clearAlert = () => {
    searchAlert.innerHTML = '';
};
const searchRoute = () => {
    clearAlert();
    searchResult.innerHTML =
        '<ul class="list-group placeholder-glow"><li class="list-group-item"><span class="placeholder col-12"></span></li><li class="list-group-item"><span class="placeholder col-12"></span></li></ul>';

    let route = document.getElementById('routeInput').value.toUpperCase();
    fetch(ROUTE_API.replace('{route}', route))
        .then((response) => response.json())
        .then((data) => {
            searchResult.innerHTML = data
                .map((element, index) => {
                    return getHtmlTemplate('searchResultRow', {
                        '{{id}}': `route-${index}`,
                        '{{json}}': utf8_to_b64(JSON.stringify(element)),
                        '{{companyLogo}}': getCompanyImage(element.company),
                        '{{companyName}}': element.company,
                        '{{text}}': `${element.orig}➡️${element.dest}`,
                        '{{description}}': element.description,
                    }).outerHTML;
                })
                .join('');
        })
        .catch(function (error) {
            console.log(error);
            alert(`Cannot find route ${route} !`, 'danger');
            searchResult.innerHTML = '';
        });
};
const renderRoute = (id, encodedJson) => {
    Array.from(document.querySelectorAll('.list-group-item, .dropdown-item')).forEach(function (element) {
        element.classList.remove('active');
    });
    document.getElementById(id).classList.add('active');
    const json = JSON.parse(b64_to_utf8(encodedJson));

    // remove all markers
    markersLayer.clearLayers();

    // add stops to layer
    json.stopList.forEach((stop) => {
        const option = {
            company: json.company,
            route: json.route,
            routeId: json.routeId,
            routeType: json.routeType,
            routeDesc: `${json.orig}➡️${json.dest}`,
            dir: json.dir,
            stop: stop.id,
            name: stop.name,
            address: `${stop.lat},${stop.long}`,
            street: stop.street,
            fare: stop.fare,
            fareHoliday: stop.fareHoliday,
        };
        var marker = L.marker([stop.lat, stop.long], option).addTo(map);
        marker.bindPopup(defaultPopupContent, defaultPopupOption);
        markersLayer.addLayer(marker);
    });

    // add geometry data to layer
    let isAntPath = true;
    let path;
    let lineColor = getCompanyColor(json.company, false);
    let lineColorPluse = getCompanyColor(json.company, true);
    switch (json.company) {
        case 'kmb':
            path = `kmb/${json.route}/${json.dir}_${json.routeType}`;
            break;
        case 'ctb':
            path = `ctb/${json.route}/${json.dir}`;
            break;
        case 'nwfb':
            path = `nwfb/${json.route}/${json.dir}`;
            break;
        case 'nlb':
            path = `nlb/${json.route}/${json.routeId}`;
            break;
        case 'mtr':
            path = `mtr/${json.route}/${json.dir}`;
            break;
        case 'mtr_hr':
            path = `mtr_hr/${json.routeId}`;
            isAntPath = false;
            lineColor = getMtrColor('route-hr', json.routeId);
            break;
    }
    fetch(SPATIAL_API.replace('{path}', `${path}`))
        .then((response) => response.json())
        .then((data) => {
            let polyline = isAntPath
                ? L.polyline.antPath(data, {
                      color: lineColor,
                      pluseColor: lineColorPluse,
                      ...antPathOption,
                  })
                : L.polyline(data, { color: lineColor });
            markersLayer.addLayer(polyline);
        })
        .catch(function (error) {
            // no geometry data, show default line by join all stops
            let data = json.stopList.map((stop) => [stop.lat, stop.long]);
            data = [data];
            let polyline = isAntPath
                ? L.polyline.antPath(data, {
                      color: lineColor,
                      pluseColor: lineColorPluse,
                      ...antPathOption,
                  })
                : L.polyline(data, { color: lineColor });
            markersLayer.addLayer(polyline);
        });

    // add layer to map
    markersLayer.addTo(map);
    map.fitBounds(markersLayer.getBounds());

    if (window.innerWidth < 768) {
        searchDrawer.hide();
    }
};
const renderBookmarkStop = (event) => {
    // remove all markers
    markersLayer.clearLayers();

    let bookmarkRow = event.target.closest('div.list-group-item');
    const json = JSON.parse(b64_to_utf8(bookmarkRow.dataset.routeJson));
    const point = json.address.split(',');
    const option = {
        company: json.company,
        route: json.route,
        routeId: json.routeId,
        routeType: json.routeType,
        routeDesc: json.routeDesc,
        dir: json.dir,
        stop: json.stop,
        name: json.name,
        address: json.address,
        street: json.street,
        fare: json.fare,
        fareHoliday: json.fareHoliday,
    };
    var marker = L.marker(point, option).addTo(map);
    marker.bindPopup(defaultPopupContent, defaultPopupOption);
    markersLayer.addLayer(marker);

    // add layer to map
    markersLayer.addTo(map);
    map.fitBounds(markersLayer.getBounds());

    marker.openPopup();

    if (window.innerWidth < 768) {
        searchDrawer.hide();
    }
};
const getEta = async (stop) => {
    return fetch(ETA_API, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify([stop]),
    })
        .then((response) => response.json())
        .then((json) => json[0])
        .catch((error) => console.error(error));
};
const openPopup = async (e) => {
    var marker = e.popup._source;
    let bookmarkBtn = getHtmlTemplate('bookmarkBtn').outerHTML;
    const bookmarkJson = {
        company: marker.options.company,
        route: marker.options.route,
        routeId: marker.options.routeId,
        routeType: marker.options.routeType,
        routeDesc: marker.options.routeDesc,
        dir: marker.options.dir,
        stop: marker.options.stop,
        name: marker.options.name,
        address: marker.options.address,
        street: marker.options.street,
        fare: marker.options.fare,
        fareHoliday: marker.options.fareHoliday,
        railwayFilterDir: marker.options.railwayFilterDir,
    };

    if ('mtr_hr' === marker.options.company) {
        let bookmarkJsonUT = {
            ...bookmarkJson,
            dir: 'UT',
        };
        let bookmarkJsonDT = {
            ...bookmarkJson,
            dir: 'DT',
        };

        let etaResult = [];
        if (
            marker.options.railwayFilterDir === undefined ||
            (marker.options.railwayFilterDir && marker.options.railwayFilterDir.contains('UT'))
        ) {
            const etaUT = await getEta({ ...marker.options, dir: 'UT' })
                .then((etaArray) =>
                    etaArray
                        .map((eta) => {
                            let text = '',
                                etaTime = '';
                            if (eta.eta != null) {
                                text += `往${eta.dest}`;
                                etaTime = `${Math.max(eta.eta, 0)}分鐘`;
                            }
                            if (eta.remark) {
                                line += ` (${eta.remark})`;
                            }
                            return getHtmlTemplate('railwayEtaRow', {
                                '{{css}}': `background-color: ${getMtrColor('route-hr', marker.options.routeId)}`,
                                '{{platform}}': eta.platform,
                                '{{text}}': text,
                                '{{eta}}': etaTime,
                            }).outerHTML;
                        })
                        .join(''),
                )
                .catch(() => '<div>未有資料</div>');
            etaResult.push(`<div class="row">
            <div class="col">${etaUT}</div>
            <div class="col-auto">${isBoomarked(bookmarkJsonUT) ? bookmarkBtn : getAddBookmarkBtn(bookmarkJsonUT)}</div>
            </div>`);
        }

        if (
            marker.options.railwayFilterDir === undefined ||
            (marker.options.railwayFilterDir && marker.options.railwayFilterDir.contains('DT'))
        ) {
            const etaDT = await getEta({ ...marker.options, dir: 'DT' })
                .then((etaArray) =>
                    etaArray
                        .map((eta) => {
                            let text = '',
                                etaTime = '';
                            if (eta.eta != null) {
                                text += `往${eta.dest}`;
                                etaTime = `${Math.max(eta.eta, 0)}分鐘`;
                            }
                            if (eta.remark) {
                                line += ` (${eta.remark})`;
                            }
                            return getHtmlTemplate('railwayEtaRow', {
                                '{{css}}': `background-color: ${getMtrColor('route-hr', marker.options.routeId)}`,
                                '{{platform}}': eta.platform,
                                '{{text}}': text,
                                '{{eta}}': etaTime,
                            }).outerHTML;
                        })
                        .join(''),
                )
                .catch(() => '<div>未有資料</div>');
            etaResult.push(`<div class="row">
            <div class="col">${etaDT}</div>
            <div class="col-auto">${isBoomarked(bookmarkJsonDT) ? bookmarkBtn : getAddBookmarkBtn(bookmarkJsonDT)}</div>
            </div>`);
        }

        const body = etaResult.join('<hr class="my-2">');
        const titleCss = `background-color: ${getMtrColor('route-hr', marker.options.routeId)}; min-width: 250px;`;
        const stationCss = `background-color: ${getMtrColor('station-hr', marker.options.stop)}; color: ${getMtrTextColor('station-hr', marker.options.stop)};`;

        const popupContent = getHtmlTemplate('etaPopupRailway', {
            '{{companyLogo}}': getCompanyImage(marker.options.company),
            '{{route}}': marker.options.route,
            '{{station}}': marker.options.name,
            '{{titleCss}}': titleCss,
            '{{stationCss}}': stationCss,
            '{{body}}': body,
        });
        marker._popup.setContent(popupContent);
    } else {
        if (!isBoomarked(marker.options)) {
            bookmarkBtn = getAddBookmarkBtn(bookmarkJson);
        }

        const eta = await getEta(marker.options)
            .then((etaArray) =>
                etaArray
                    .map((eta) => {
                        let line = '<div>';
                        if ('mtr_lr' === marker.options.company) {
                            line += `<span class="badge rounded-pill text-white me-1" style="background-color: ${getMtrColor('lr')};">${eta.platform}</span>`;
                        }
                        if (eta.eta != null) {
                            line += `${Math.max(eta.eta, 0)}分鐘`;
                        }
                        if (eta.remark) {
                            line += ` (${eta.remark})`;
                        }
                        if ('mtr_lr' === marker.options.company) {
                            line += '<div class="float-end">';
                            for (let i = 0; i < eta.trainLength; i++) {
                                line += '🚃';
                            }
                            line += '</div>';
                        }
                        line += '</div>';
                        return line;
                    })
                    .join(''),
            )
            .catch(() => '<div>未有資料</div>');
        const body = `${eta}`;
        let titleCss = `background-color: ${getCompanyColor(marker.options.company)}`;
        let routeNoCss = '',
            routeNoClass = '';
        const subtitle = marker.options.routeDesc;
        if ('mtr_lr' === marker.options.company) {
            titleCss = `background-color: ${getMtrColor('lr')}; color: ${getMtrTextColor('lr')};`;
            routeNoCss = `--border-color: ${getMtrColor('route-lr', marker.options.routeId)};`;
            routeNoClass = 'mtrLrRoute';
        }

        const popupContent = getHtmlTemplate('etaPopup', {
            '{{companyLogo}}': getCompanyImage(marker.options.company),
            '{{routeNo}}': marker.options.route,
            '{{routeNoClass}}': routeNoClass,
            '{{routeNoCss}}': routeNoCss,
            '{{title}}': marker.options.name,
            '{{subtitle}}': subtitle,
            '{{titleCss}}': titleCss,
            '{{bookmarkBtn}}': bookmarkBtn,
            '{{body}}': body,
        });
        marker._popup.setContent(popupContent);
    }
};
const getAddBookmarkBtn = (json, groupName = null) => {
    if (groupName === null) {
        let bookmarkGroupList = document.querySelectorAll(`div.list-group-item.group`);
        if (bookmarkGroupList.length == 0) {
            groupName = '預設群組';
            addGroup(groupName);
        } else {
            groupName = bookmarkGroupList[0].dataset.groupName;
        }
    }
    return `<button class="btn btn-sm btn-outline-warning" onclick="addBookmark('${groupName}', '${utf8_to_b64(JSON.stringify(json))}', true)"><i id="bookmarkPopupIcon" class="bi bi-bookmark-plus" aria-label="收藏路線"></i></button>`;
};
const routeTypeClick = (type) => {
    searchResult.innerHTML = '';
    Array.from(document.querySelectorAll('[data-route-type]')).forEach(function (element) {
        if (element.dataset.routeType === type) {
            element.classList.remove('d-none');
        } else {
            element.classList.add('d-none');
        }
    });
    if (type === 'mtr') {
        searchResult.innerHTML = mtrHrData
            .map((route, index) => {
                return getHtmlTemplate('searchResultRailwayRow', {
                    '{{id}}': `route-${index}`,
                    '{{json}}': utf8_to_b64(JSON.stringify(route)),
                    '{{backgroundColor}}': getMtrColor('route-hr', route.routeId),
                    '{{text}}': `${route.route} (${route.orig}↔️${route.dest})`,
                }).outerHTML;
            })
            .join('');
    }
};

// events
document.getElementById('btnSearch').onclick = searchRoute;
document.getElementById('routeInput').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        document.getElementById('btnSearch').click();
    }
});

// leaflet
var markersLayer = new L.FeatureGroup();
const topographicMapTiles = L.tileLayer(topographicMapAPI, {
    maxZoom: 20,
    attribution: attributionInfo,
});
const imageryMapTiles = L.tileLayer(imageryMapAPI, {
    maxZoom: 20,
    attribution: attributionInfo,
});
const label = L.tileLayer(labelAPI, {
    maxZoom: 20,
    attribution: attributionInfo,
});
const baseMaps = {
    地形圖: topographicMapTiles,
    影像地圖: imageryMapTiles,
};
const overlays = {
    地名標籤: label,
};
const map = L.map('map', {
    center: [22.322005998683245, 114.17846497109828],
    zoom: 13,
    layers: [topographicMapTiles, label],
});
const layerControl = L.control.layers(baseMaps, overlays, { hideSingleBase: true }).addTo(map);
map.on('popupopen', openPopup);

// page init
fetch(SIRI_SHORTCUT_UPDATE_API)
    .then((response) => response.json())
    .then((data) => {
        document.getElementById('getSiriShortcut').setAttribute('href', data.url);
        document.getElementById('siriShortcutVersion').innerHTML = `(v${data.version})`;
    });
mtrHrData = await fetch(ROUTE_API.replace('{route}', 'mtr_hr')).then((response) => response.json());

// export
window.renderRoute = renderRoute;
window.renderBookmarkStop = renderBookmarkStop;
window.routeTypeClick = routeTypeClick;
