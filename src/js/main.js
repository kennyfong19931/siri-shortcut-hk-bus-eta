import "../scss/styles.scss";
import Offcanvas from 'bootstrap/js/src/offcanvas';
import Dropdown from 'bootstrap/js/src/dropdown';
import { utf8_to_b64, b64_to_utf8, getCompanyImage, getCompanyColor, getHtmlTemplate, getPageWidth, getMtrHrColor } from './util.js';

const ROUTE_API = `/api/route/{route}.json`;
const SPATIAL_API = `/api/spatial/{path}.json`;
const ETA_API = `/api/eta`;
const SIRI_SHORTCUT_UPDATE_API = '/update.json';
const searchAlert = document.getElementById('searchAlert');
const searchResult = document.getElementById("searchResult");
const searchDrawer = new Offcanvas('#searchDrawer');
const routeTypeDropdown = new Dropdown('#routeTypeDropdown');
const mtrDropdown = new Dropdown('#mtrDropdown');
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
const defaultPopupContent = '<span class="loader m-3"></span>';
const defaultPopupOption = { className: 'etaPopup', maxWidth: getPageWidth() };
let mtrHrData;

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
    Array.from(document.querySelectorAll(".list-group-item, .dropdown-item")).forEach(function (element) {
        element.classList.remove("active");
    });
    document.getElementById(id).classList.add("active");
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
    })

    // add geometry data to layer
    let path;
    const lineColor = getCompanyColor(json.company, false);
    const lineColorPluse = getCompanyColor(json.company, true);
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
        case 'gmb':
            path = '';
            break;
    }
    if (path) {
        fetch(SPATIAL_API.replace("{path}", `${path}`))
            .then(response => response.json())
            .then((data) => {
                let polyline = L.polyline.antPath(data, { color: lineColor, pluseColor: lineColorPluse, ...antPathOption });
                markersLayer.addLayer(polyline);
            })
            .catch(function (error) {
                // no geometry data, show default line by join all stops
                let data = json.stopList.map((stop) => [stop.lat, stop.long]);
                data = [data];
                let polyline = L.polyline.antPath(data, { color: lineColor, pluseColor: lineColorPluse, ...antPathOption });
                markersLayer.addLayer(polyline);
            });
    }

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
}
const getEta = async (stop) => {
    return fetch(ETA_API, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify([stop])
    })
        .then(response => response.json())
        .then(json => json[0])
        .catch((error) => console.error(error));
}
const openPopup = async (e) => {
    let body = '', subtitle = '', titleCss = '', companyLogoClass = '';
    var marker = e.popup._source;
    let bookmarkBtn = getHtmlTemplate('bookmarkBtn');
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

        const etaUT = await getEta({ ...marker.options, dir: 'UT' })
            .then((etaArray) => etaArray.map((eta) => {
                let line = `<li><span class="badge rounded-pill text-bg-secondary me-1">${eta.platform}</span>往${eta.dest}`;
                if (eta.remark) {
                    line += ` (${eta.remark})`;
                }
                if (eta.eta != null) {
                    line += `<span class="float-end">${eta.eta > -1 ? 0 : eta.eta}分鐘</span>`;
                }
                line += '</li>';
                return line;
            })
                .join('')
            )
            .catch(() => '<div>未有資料</div>');

        const etaDT = await getEta({ ...marker.options, dir: 'DT' })
            .then((etaArray) => etaArray.map((eta) => {
                let line = `<div><span class="badge rounded-pill text-bg-secondary me-1">${eta.platform}</span>往${eta.dest}`;
                if (eta.remark) {
                    line += ` (${eta.remark})`;
                }
                if (eta.eta != null) {
                    line += `<span class="float-end">${eta.eta > -1 ? 0 : eta.eta}分鐘</span>`;
                }
                line += '</div>';
            })
                .join('')
            )
            .catch(() => '<div>未有資料</div>');

        body = `<div class="row">
        <div class="col">${etaUT}</div>
        <div class="col-auto">${isBoomarked(bookmarkJsonUT) ? bookmarkBtn : getAddBookmarkBtn(bookmarkJsonUT)}</div>
        </div>
        <hr class="my-2"><div class="row">
        <div class="col">${etaDT}</div>
        <div class="col-auto">${isBoomarked(bookmarkJsonDT) ? bookmarkBtn : getAddBookmarkBtn(bookmarkJsonDT)}</div>
        </div>`;
        titleCss = `background-color: ${getMtrHrColor(marker.options.routeId)}`;
        companyLogoClass = 'd-none';
        bookmarkBtn = '';
    } else {
        if (isBoomarked(marker.options)) {
            bookmarkBtn = getAddBookmarkBtn(bookmarkJson);
        }

        const eta = await getEta(marker.options)
            .then((etaArray) => etaArray.map((eta) => {
                let line = '<li>';
                if (eta.eta != null) {
                    line += `${eta.eta > -1 ? 0 : eta.eta}分鐘`;
                }
                if (eta.remark) {
                    line += ` (${eta.remark})`;
                }
                line += '</li>';
                return line;
            })
                .join('')
            )
            .catch(() => '<li>未有資料</li>');
        body = `<ul>${eta}</ul>`;
        titleCss = `background-color: ${getCompanyColor(marker.options.company)}`;
        subtitle = marker.options.routeDesc;
    }

    const popupContent = getHtmlTemplate('etaPopup', {
        '{{companyLogoClass}}': companyLogoClass,
        '{{companyLogo}}': getCompanyImage(marker.options.company),
        '{{routeNo}}': marker.options.route,
        '{{title}}': marker.options.name,
        '{{subtitle}}': subtitle,
        '{{titlecss}}': titleCss,
        '{{bookmarkBtn}}': bookmarkBtn,
        '{{body}}': body,
    });
    marker._popup.setContent(popupContent);
}
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
}
const routeTypeClick = (el, type) => {
    document.getElementById("routeTypeSelected").innerText = el.innerText;
    Array.from(document.querySelectorAll("[data-route-type]")).forEach(function (element) {
        if (element.dataset.routeType === type) {
            element.classList.remove("d-none");
        } else {
            element.classList.add("d-none");
        }
    });
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
    center: [22.322005998683245, 114.17846497109828],
    zoom: 13,
    layers: [topographicMapTiles, label]
});
const layerControl = L.control.layers(baseMaps, overlays, { hideSingleBase: true }).addTo(map);
map.on('popupopen', openPopup);

// page init
fetch(SIRI_SHORTCUT_UPDATE_API)
    .then(response => response.json())
    .then((data) => {
        document.getElementById("getSiriShortcut").setAttribute('href', data.url);
        document.getElementById("siriShortcutVersion").innerHTML = `(v${data.version})`;
    });
mtrHrData = await fetch(ROUTE_API.replace("{route}", 'mtr_hr'))
    .then(response => response.json())
    .then((data) => {
        // add route as select options
        data.filter((route) => route.dir === 'UT')
            .forEach((route) => {
                let li = getHtmlTemplate('mtrRouteRow', {
                    '{{route}}': `${route.route} (${route.orig}↔️${route.dest})`,
                    '{{routeId}}': route.routeId,
                    '{{json}}': utf8_to_b64(JSON.stringify(route)),
                    '{{backgroundColor}}': getMtrHrColor(route.routeId),
                });
                document.getElementById("routeInputMtrList").append(li);
            });

        return data;
    });

// export
window.renderRoute = renderRoute;
window.renderBookmarkStop = renderBookmarkStop;
window.routeTypeClick = routeTypeClick;