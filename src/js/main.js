import "../scss/styles.scss";
import Offcanvas from 'bootstrap/js/src/offcanvas';
import {utf8_to_b64, b64_to_utf8, getCompanyImage} from './util.js';

const ROUTE_API = `/api/route/{route}.json`;
const SPATIAL_API = `/api/spatial/{path}.json`;
const ETA_API = `/api/eta`;
const SIRI_SHORTCUT_UPDATE_API = '/update.json';
const searchAlert = document.getElementById('searchAlert');
const searchResult = document.getElementById("searchResult");
const searchDrawer = new Offcanvas('#searchDrawer');
const topographicMapAPI = 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/basemap/wgs84/{z}/{x}/{y}.png';
const imageryMapAPI = 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/imagery/wgs84/{z}/{x}/{y}.png';
const labelAPI = 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/label/hk/tc/wgs84/{z}/{x}/{y}.png';
const attributionInfo = '<a target="_blank" href="https://portal.csdi.gov.hk/">&copy; 地圖版權屬香港特區政府</a><img style="width:16px;height:16px;" src="https://api.hkmapservice.gov.hk/mapapi/landsdlogo.jpg" />';
const antPathOption = {
    "delay": 400,
    "dashArray": [
        20,
        40
    ],
    "weight": 5,
    // "color": "#0000FF",
    // "pulseColor": "#FFFFFF",
    "paused": false,
    "reverse": false,
    "hardwareAccelerated": true
};

// functions
const alert = (message, type) => {
    let html = `<div class="alert alert-${type}" role="alert"><div>${message}</div></div>`;
    searchAlert.innerHTML += html;
}
const clearAlert = () => {
    searchAlert.innerHTML = '';
}
const searchRoute = () => {
    clearAlert();
    searchResult.innerHTML = '<ul class="list-group placeholder-glow"><li class="list-group-item"><span class="placeholder col-12"></span></li><li class="list-group-item"><span class="placeholder col-12"></span></li></ul>';

    let route = document.getElementById("routeInput").value.toUpperCase();
    fetch(ROUTE_API.replace("{route}", route))
        .then(response => response.json())
        .then((data) => {
            searchResult.innerHTML = '';
            data.forEach((element, index) => {
                let html = `<div class="d-flex align-items-center list-group-item list-group-item-action" id="route-${index}" onclick="renderRoute('route-${index}', '${utf8_to_b64(JSON.stringify(element))}')">` +
                    `<div class="flex-shrink-0"><img class="logo" src="${getCompanyImage(element.company)}" alt="${element.company}"/></div>` +
                    `<div class="flex-grow-1 ms-3">${element.orig}➡️${element.dest}</div>` +
                    `</div>`;
                searchResult.innerHTML += html;
            });
        })
        .catch(function (error) {
            console.log(error);
            alert(`Cannot find route ${route} !`, 'danger');
            searchResult.innerHTML = '';
        });
}
const renderRoute = (id, encodedJson) => {
    Array.from(document.getElementsByClassName("list-group-item")).forEach(function (element) {
        element.classList.remove("active");
    });
    document.getElementById(id).classList.add("active");
    const json = JSON.parse(b64_to_utf8(encodedJson));

    // remove all markers
    markersLayer.clearLayers();

    // add stops to layer
    json.stopList.forEach((stop) => {
        const option = {
            bookmarked: false,
            company: json.company,
            route: json.route,
            routeId: json.routeId,
            routeType: json.routeType,
            routeOrig: json.orig,
            routeDest: json.dest,
            dir: json.dir,
            stop: stop.id,
            name: stop.name,
            lat: stop.lat,
            long: stop.long,
            street: stop.street,
            fare: stop.fare,
            fareHoliday: stop.fareHoliday,
        };
        var marker = L.marker([ stop.lat, stop.long ], option).addTo(map);
        marker.bindPopup(`${stop.name}`);
        markersLayer.addLayer(marker);
    })

    // add geometry data to layer
    let path;
    let lineColor = "#FF0000";
    let lineColorPluse = "#FFFFFF";
    switch (json.company) {
        case 'kmb':
            path = `kmb/${json.route}/${json.dir}_${json.routeType}`;
            lineColor = "#FF0000";
            lineColorPluse = "#FFFFFF";
            break;
        case 'ctb':
            path = `ctb/${json.route}/${json.dir}`;
            lineColor = "#F1CC02";
            lineColorPluse = "#0080FF";
            break;
        case 'nwfb':
            path = `nwfb/${json.route}/${json.dir}`;
            lineColor = "#EF7925";
            lineColorPluse = "#7000CC";
            break;
        case 'nlb':
            path = `nlb/${json.route}/${json.routeId}`;
            lineColor = "#2A897B";
            lineColorPluse = "#3DC9B4";
            break;
        case 'gmb':
            lineColor = "#337149";
            lineColorPluse = "#53B776";
            break;
        case 'mtr':
            path = `mtr/${json.route}/${json.dir}`;
            lineColor = "#1A81FF";
            lineColorPluse = "#53B776";
            break;
    }
    fetch(SPATIAL_API.replace("{path}", `${path}`))
        .then(response => response.json())
        .then((data) => {
            let polyline = L.polyline.antPath(data, {color: lineColor, pluseColor: lineColorPluse, ...antPathOption});
            markersLayer.addLayer(polyline);
        })
        .catch(function (error) {
            // no geometry data, show default line by join all stops
            let data = json.stopList.map((stop) => [ stop.lat, stop.long ]);
            data = [ data ];
            let polyline = L.polyline.antPath(data, {color: lineColor, pluseColor: lineColorPluse, ...antPathOption});
            markersLayer.addLayer(polyline);
        });

    // add layer to map
    markersLayer.addTo(map);
    map.fitBounds(markersLayer.getBounds());

    if (window.innerWidth < 768) {
        searchDrawer.hide();
    }
}
const renderBookmarkStop = (event) => {
    // remove all markers
    markersLayer.clearLayers();

    let bookmarkRow = event.target.closest('div.list-group-item');
    const json = JSON.parse(b64_to_utf8(bookmarkRow.dataset.routeJson));
    const point = json.address.split(",");
    const option = {
        bookmarked: true,
        company: json.company,
        route: json.route,
        routeId: json.routeId,
        routeType: json.serviceType,
        dir: json.dir,
        routeDesc: json.routeDesc,
        stop: json.stopId,
        name: json.name,
        address: json.address,
        street: json.street,
        fare: json.fare,
        fareHoliday: json.fareHoliday,
    };
    var marker = L.marker(point, option).addTo(map);
    marker.bindPopup(`${json.name}`);
    markersLayer.addLayer(marker);

    // add layer to map
    markersLayer.addTo(map);
    map.fitBounds(markersLayer.getBounds());

    marker.openPopup();

    if (window.innerWidth < 768) {
        searchDrawer.hide();
    }
}
const getEta = (stop) => {
    return fetch(ETA_API, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify([ stop ])
    })
        .then(response => response.json())
        .then(json => json[0])
        .catch(function (error) {
            console.error(error);
            return [ {eta: null, remark: "未有資料"} ];
        });
}
const openPopup = (e) => {
    var marker = e.popup._source;
    const eta = getEta(marker.options)
        .map((eta) => {
            let line = '<li>';
            if (eta.eta) {
                line += eta.eta + '分鐘';
            }
            if (eta.remark) {
                line += '(' + eta.remark + ')';
            }
            line += '</li>';
            return line;
        })
        .join('');
    let bookmarkBtn = '<button class="btn btn-sm btn-outline-warning m-2"><i class="bi bi-bookmark-fill" aria-label="已收藏路線"></i></button>';
    if (!marker.options.bookmarked) {
        let groupName;
        let bookmarkGroupList = document.querySelectorAll(`div.list-group-item.group`);
        if (bookmarkGroupList.length == 0) {
            addGroup('預設群組');
            groupName = '預設群組';
        } else {
            groupName = bookmarkGroupList[0].dataset.groupName;
        }
        const json = {
            company: marker.options.company,
            route: marker.options.route,
            routeId: marker.options.routeId,
            routeType: marker.options.routeType,
            dir: marker.options.dir,
            routeDesc: `${marker.options.routeOrig}➡️${marker.options.routeDest}`,
            stop: marker.options.stop,
            name: marker.options.name,
            address: `${marker.options.lat},${marker.options.long}`,
            street: marker.options.street,
            fare: marker.options.fare,
            fareHoliday: marker.options.fareHoliday,
        };
        bookmarkBtn = `<button class="btn btn-sm btn-outline-warning m-2" onclick="addBookmark('${groupName}', '${utf8_to_b64(JSON.stringify(json))}', true)"><i id="bookmarkPopupIcon" class="bi bi-bookmark-plus" aria-label="收藏路線"></i></button>`;
    }
    const popupContent = `<b><img class="logo" src="${getCompanyImage(marker.options.company)}" alt="${marker.options.company}"/> ${marker.options.route} - ${marker.options.name}</b>${bookmarkBtn}<br/><small>${marker.options.routeDesc}</small><br/><ul>${eta}</ul>`;
    marker._popup.setContent(popupContent);
}

// events
document.getElementById("btnSearch").onclick = searchRoute;
document.getElementById("routeInput").addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById("btnSearch").click();
    }
});

// leaflet
var markersLayer = new L.FeatureGroup();
const topographicMapTiles = L.tileLayer(topographicMapAPI, {
    maxZoom: 20,
    attribution: attributionInfo
});
const imageryMapTiles = L.tileLayer(imageryMapAPI, {
    maxZoom: 20,
    attribution: attributionInfo
});
const label = L.tileLayer(labelAPI, {
    maxZoom: 20,
    attribution: attributionInfo
});
const baseMaps = {
    "地形圖": topographicMapTiles,
    "影像地圖": imageryMapTiles
};
const overlays = {
    "地名標籤": label
};
const map = L.map('map', {
    center: [ 22.322005998683245, 114.17846497109828 ],
    zoom: 13,
    layers: [ topographicMapTiles, label ]
});
const layerControl = L.control.layers(baseMaps, overlays, {hideSingleBase: true}).addTo(map);
map.on('popupopen', openPopup);

// page init
fetch(SIRI_SHORTCUT_UPDATE_API)
    .then(response => response.json())
    .then((data) => {
        document.getElementById("getSiriShortcut").setAttribute('href', data.url);
        document.getElementById("siriShortcutVersion").innerHTML = `(v${data.version})`;
    });

// export
window.renderRoute = renderRoute;
window.renderBookmarkStop = renderBookmarkStop;