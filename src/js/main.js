import '../scss/styles.scss';
import { Collapse, Tab } from 'bootstrap';
import Sortable from 'sortablejs';
import {
    getCompanyColor,
    getCompanyImage,
    getCompanyName,
    getHtmlTemplate,
    getMtrColor,
    getMtrTextColor,
    getPageWidth,
    utf8_to_b64,
    processFullGeometry,
    getJourneyTime,
} from './util.js';
import { analyzeMultiHighwayRoute } from './highwayAnalysisWorkerClient.js';
import { analyzeInterchangeData } from './interchangeAnalysisWorkerClient.js';

const searchAlert = document.getElementById('searchAlert');
const searchResult = document.getElementById('searchResult');
const stopTab = document.getElementById('stopTab');
const fareSection = document.getElementById('fareSection');
const stopListHeader = document.getElementById('stopListHeader');
const stopList = document.getElementById('stopList');
const mainMenuHeaderDiv = document.getElementById('mainMenuHeaderDiv');
const settingStraightenLine = document.getElementById('settingStraightenLine');
const settingStopListRow = document.getElementById('settingStopListRow');
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
const stopZoomLevel = 17;
let mtrHrData;
let stopListData;
let stopListCompany;
let highwayAnalysis = [];
let highwayAnalysisRequest = 0;
let interchangeAnalysis = [];
let interchangeAnalysisRequest = 0;
let fareData = [];

// functions
const alert = (message, type) => {
    let html = `<div class="alert alert-${type}" role="alert"><div>${message}</div></div>`;
    searchAlert.innerHTML += html;
};
const clearAlert = () => {
    searchAlert.innerHTML = '';
};
const setActive = (id) => {
    Array.from(document.querySelectorAll('.list-group-item, .dropdown-item')).forEach(function (element) {
        element.classList.remove('active');
    });
    if (id) {
        document.getElementById(id).classList.add('active');
    }
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
                        '{{href}}': getRouteUrl(element),
                        '{{companyLogo}}': getCompanyImage(element.company),
                        '{{companyName}}': element.company,
                        '{{text}}': `${element.orig}➡️${element.dest}`,
                        '{{description}}': element.description,
                    }).outerHTML;
                })
                .join('');
            reloadRouter();
        })
        .catch(function (error) {
            console.log(error);
            alert(`Cannot find route ${route} !`, 'danger');
            searchResult.innerHTML = '';
        });
};
const renderRoute = (json, withStop) => {
    // un select all tab
    stopTab.disabled = false;
    const activeTab = document.querySelector('#mainTab .active');
    const activeTabPane = document.querySelector('#mainTabContent .tab-pane.active');
    if (activeTab) {
        activeTab.classList.remove('active');
        activeTab.setAttribute('aria-selected', 'false');
    }
    if (activeTabPane) {
        activeTabPane.classList.remove('active');
    }
    renderStopList(json.stopList, undefined, json.company);
    renderFare(json);

    // update header
    let stopIndexColor;
    if ('mtr_hr' === json.company) {
        stopIndexColor = getMtrColor('route-hr', json.routeId);
        const options = {
            '{{companyLogo}}': getCompanyImage(json.company),
            '{{route}}': json.route,
            '{{titleCss}}': `background-color: ${stopIndexColor}; min-width: 250px;`,
        };
        mainMenuHeaderDiv.innerHTML = getHtmlTemplate('mainMenuHeaderRailway', options).outerHTML;
    } else {
        stopIndexColor = getCompanyColor(json.company);
        let titleCss = `background-color: ${stopIndexColor}`;
        let routeNoCss = '',
            routeNoClass = '';
        if ('mtr_lr' === json.company) {
            stopIndexColor = getMtrColor('route-lr', json.routeId);
            titleCss = `background-color: ${getMtrColor('lr')}; color: ${getMtrTextColor('lr')};`;
            routeNoCss = `--border-color: ${stopIndexColor};`;
            routeNoClass = 'mtrLrRoute';
        }
        const options = {
            '{{companyLogo}}': getCompanyImage(json.company),
            '{{routeNo}}': json.route,
            '{{routeNoClass}}': routeNoClass,
            '{{routeNoCss}}': routeNoCss,
            '{{title}}': `${json.orig}➡️${json.dest}`,
            '{{titleCss}}': titleCss,
        };
        mainMenuHeaderDiv.innerHTML = getHtmlTemplate('mainMenuHeader', options).outerHTML;
    }
    document.getElementById('mainMenu').style.setProperty('--stop-index-color', stopIndexColor);

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
            railwayFilterDir: stop.railwayFilterDir,
        };
        var marker = L.marker([stop.lat, stop.long], option).addTo(map);
        marker.bindPopup(defaultPopupContent, defaultPopupOption);
        marker.on('click', () => routeNavigate(getRouteUrl(option, true)));
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
            path = `mtr/${json.route}/${json.routeType}`;
            break;
        case 'mtr_hr':
            path = `mtr_hr/${json.routeId}`;
            isAntPath = false;
            lineColor = getMtrColor('route-hr', json.routeId);
            break;
        case 'mtr_lr':
            path = `mtr_lr/${json.route}/${json.dir}`;
            lineColor = getMtrColor('route-lr', json.routeId);
            lineColorPluse = getMtrColor('route-lr', json.routeId);
            break;
        case 'gmb':
            path = `gmb/${json.route}/${json.routeId}_${json.routeType}`;
            break;
    }
    fetch(SPATIAL_API.replace('{path}', `${path}`))
        .then((response) => response.json())
        .then((data) => {
            const straightenLine = 'N' !== localStorage.getItem('straightenLine');
            if (straightenLine) {
                const result = processFullGeometry(data);
                data = result.newLines;
            }
            let polyline = isAntPath
                ? L.polyline.antPath(data, {
                      color: lineColor,
                      pluseColor: lineColorPluse,
                      ...antPathOption,
                  })
                : L.polyline(data, { color: lineColor });
            markersLayer.addLayer(polyline);
            renderStopList(json.stopList, data, json.company);
        })
        .catch(function (error) {
            console.log(error);
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
    if (!withStop) {
        map.fitBounds(markersLayer.getBounds(), { animate: true, padding: [20, 20] });
    }

    updateSEO('route', json);
};
const renderFare = async (route) => {
    fareSection.innerHTML = '';
    const gtfsId = route.company === 'gmb' ? `${route.routeId}_${route.routeType}` : route.gtfsId;
    if (!gtfsId) return;

    try {
        if (fareData.length === 0) {
            fareData = await fetch(FARE_API).then((response) => {
                if (!response.ok) throw new Error(`Fare data request failed: ${response.status}`);
                return response.json();
            });
        }
        const fareRecords = fareData.filter((record) => record.gtfsId === gtfsId);
        const stopIndexByGtfsId = new Map(
            route.stopList
                .map((stop, index) => [route.company === 'gmb' ? stop.id : stop.gtfsId, index])
                .filter(([stopGtfsId]) => !!stopGtfsId),
        );
        const stopLabel = (index) => `${route.stopList[index].name}`;
        const simpleFareRecords = fareRecords.filter((record) => !record.twoWay);
        const matrixFareRecords = fareRecords.filter((record) => record.twoWay);
        const companyLinkInfo = {
            kmb: {
                name: '九巴',
                url: `https://search.kmb.hk/KMBWebSite/?action=routesearch&route=${route.route}&lang=zh`,
            },
            ctb: {
                name: '城巴',
                url: `https://mobile.citybus.com.hk/nwp3/?f=1&ds=${route.route}&dsmode=1&l=0`,
            },
            nlb: { name: '嶼巴', url: `https://www.nlb.com.hk/route/detail/${route.routeId}` },
            mtr: {
                name: '港鐵巴士',
                url: `https://www.mtr.com.hk/ch/customer/services/searchBusRouteDetails.php?routeID=${route.route}`,
            },
            gmb: {
                name: '專線小巴',
                url: `https://h2-app-rr.hkemobility.gov.hk/ris_page/get_gmb_detail.php?lang=TC&route_id=${route.routeId}`,
            },
        }[route.company];
        const companyLink = companyLinkInfo
            ? ` <a class="btn btn-sm btn-outline-info float-end" href="${companyLinkInfo.url}" target="_blank" rel="noopener noreferrer">${companyLinkInfo.name} <i class="bi bi-box-arrow-up-right"></i></a>`
            : '';
        let html = '';

        if (simpleFareRecords.length > 0) {
            html += `<h3 class="mb-2">全程及分段收費${companyLink}</h3><ul class="list-group mb-3">`;
            simpleFareRecords.forEach((record) => {
                record.stopList.forEach(({ fare, stopId: boardingStopId }, index) => {
                    if (index === 0) {
                        html += `<li class="list-group-item d-flex justify-content-between align-items-center"><span>全程收費</span><strong>$${fare.toFixed(2)}</strong></li>`;
                        return;
                    }
                    const originIndex = stopIndexByGtfsId.get(boardingStopId);
                    if (originIndex === undefined) return;
                    html += `<li class="list-group-item d-flex justify-content-between align-items-center"><span>${stopLabel(originIndex)} 起</span><strong>$${fare.toFixed(2)}</strong></li>`;
                });
            });
            html += '</ul>';
        }

        if (matrixFareRecords.length > 0) {
            const faresByStopPair = new Map();
            const boardingIndices = new Set();
            const dropOffIndices = new Set();
            matrixFareRecords.forEach((record) => {
                const lastDropOffByBoardingIndex = new Map();
                record.stopList.forEach(({ fare, boardingStopId, dropOffStopId }) => {
                    const originIndex = stopIndexByGtfsId.get(boardingStopId);
                    const lastDropOffIndex = stopIndexByGtfsId.get(dropOffStopId);
                    if (originIndex === undefined || lastDropOffIndex === undefined) return;
                    boardingIndices.add(originIndex);
                    dropOffIndices.add(lastDropOffIndex);
                    const firstDropOffIndex = lastDropOffByBoardingIndex.has(originIndex)
                        ? lastDropOffByBoardingIndex.get(originIndex) + 1
                        : originIndex + 1;
                    for (
                        let destinationIndex = firstDropOffIndex;
                        destinationIndex <= lastDropOffIndex;
                        destinationIndex++
                    ) {
                        faresByStopPair.set(`${originIndex}:${destinationIndex}`, fare);
                    }
                    lastDropOffByBoardingIndex.set(originIndex, lastDropOffIndex);
                });
            });
            const sortedBoardingIndices = [...boardingIndices].sort((a, b) => a - b);
            const sortedDropOffIndices = [...dropOffIndices].sort((a, b) => a - b);
            if (sortedBoardingIndices.length > 0 && sortedDropOffIndices.length > 0) {
                html +=
                    `<h3 class="mb-2">雙向分段收費${companyLink}</h3><div class="table-responsive"><table class="table table-sm table-bordered table-hover text-center align-middle mb-0" id="fareTable"><thead><tr><th scope="col">上車 ↓ / 落車 →</th>`;
                sortedDropOffIndices.forEach((index) => {
                    html += `<th class="text-break table-primary" scope="col">${route.stopList[index].name}<br/><small class="float-end">或之前</small></th>`;
                });
                html += '</tr></thead><tbody>';
                sortedBoardingIndices.forEach((originIndex) => {
                    html += `<tr><th scope="row" class="text-start table-primary">${route.stopList[originIndex].name}<br/><small class="float-end">或之後</small></th>`;
                    sortedDropOffIndices.forEach((destinationIndex) => {
                        const fare = faresByStopPair.get(`${originIndex}:${destinationIndex}`);
                        html += `<td>${fare === undefined ? '-' : `$${fare.toFixed(2)}`}</td>`;
                    });
                    html += '</tr>';
                });
                html += '</tbody></table></div>';
            }
        }

        fareSection.innerHTML = html;
    } catch (error) {
        console.error('Cannot load route fare data', error);
    }
};
const renderStopList = (inputData, spatialData, company) => {
    if (inputData) {
        highwayAnalysisRequest++;
        stopListData = inputData;
        stopListCompany = company;
        highwayAnalysis = [];
        interchangeAnalysis = [];
        const requestId = ++interchangeAnalysisRequest;
        const requestedStopList = stopListData;
        analyzeInterchangeData(requestedStopList, stopListCompany)
            .then((result) => {
                if (requestId !== interchangeAnalysisRequest || requestedStopList !== stopListData) return;
                interchangeAnalysis = result;
                renderStopList();
            })
            .catch((error) => console.error(error));
    }
    if (stopListData) {
        if (spatialData && stopListCompany !== 'mtr_lr' && stopListCompany !== 'mtr_hr') {
            const requestId = ++highwayAnalysisRequest;
            const requestedStopList = stopListData;
            analyzeMultiHighwayRoute(spatialData, requestedStopList)
                .then((result) => {
                    if (requestId !== highwayAnalysisRequest || requestedStopList !== stopListData) return;
                    highwayAnalysis = result;
                    renderStopList();
                })
                .catch((error) => console.error(error));
        }
        const setting = JSON.parse(localStorage.getItem('stopListRow'));
        const activeColumns = setting.filter((col) => col.visible);

        let headerHtml = '<div class="d-flex align-items-center stopListRow header border-bottom">';
        activeColumns.forEach((col) => {
            switch (col.id) {
                case 'index':
                    headerHtml += `<span class="index"> </span>`;
                    break;
                case 'name':
                    headerHtml += `<div class="flex-grow-1"><span class="m-1">${col.label}</span></div>`;
                    break;
                case 'journeyTime':
                    headerHtml += `<div class="stopListJourneyTime">${col.label}</div>`;
                    break;
                case 'journeyTimeAcc':
                    headerHtml += `<div class="stopListJourneyTimeAcc">${col.label}</div>`;
                    break;
                case 'interchange':
                    headerHtml += `<div class="stopListInterchange">${col.label}</div>`;
                    break;
            }
        });
        headerHtml += '</div>';
        stopListHeader.innerHTML = headerHtml;

        const highwaysByStopIndex = new Map();
        highwayAnalysis.forEach(({ highway, stopBeforeIndex }) => {
            const highwayNames = highwaysByStopIndex.get(stopBeforeIndex) || [];
            highwayNames.push(highway);
            highwaysByStopIndex.set(stopBeforeIndex, highwayNames);
        });
        const renderHighwayLabel = (stopIndex) => {
            const highwayNames = highwaysByStopIndex.get(stopIndex);
            return highwayNames
                ? `<div class="stopListHighway bg-secondary text-center small border-bottom px-3 py-1">${highwayNames.join('、')}</div>`
                : '';
        };

        stopList.innerHTML = stopListData
            .map((stop, index) => {
                let rowHtml = `<div class="d-flex align-items-center stopListRow border-bottom" onclick="triggerStopClick('${stop.id}')">`;
                activeColumns.forEach((col) => {
                    switch (col.id) {
                        case 'index':
                            rowHtml += `<span class="index${index === 0 ? ' first' : ''}${index === stopListData.length - 1 ? ' last' : ''}">${index + 1}</span>`;
                            break;
                        case 'name':
                            rowHtml += `<div class="flex-grow-1"><span class="m-1">${stop.name}</span></div>`;
                            break;
                        case 'journeyTime':
                            rowHtml += `<div class="stopListJourneyTime" data-stop-id="${stop.id}"></div>`;
                            break;
                        case 'journeyTimeAcc':
                            rowHtml += `<div class="stopListJourneyTimeAcc" data-stop-id="${stop.id}"></div>`;
                            break;
                        case 'interchange':
                            rowHtml += `<div class="stopListInterchange">${(interchangeAnalysis[index] || [])
                                .map(({name, type}) => {
                                    const icon = {
                                        mtr: ['/img/mtr.svg', '港鐵'],
                                        lrt: ['/img/mtr_lr.svg', '輕鐵'],
                                        bus: ['/img/bbi.svg', '巴士'],
                                    }[type];
                                    return icon
                                        ? `<img src="${icon[0]}" width="16" height="16" title="${icon[1]} - ${name}">`
                                        : '';
                                })
                                .join('')}</div>`;
                            break;
                    }
                });
                rowHtml += '</div>';
                return rowHtml + (index < stopListData.length - 1 ? renderHighwayLabel(index) : '');
            })
            .join('');

        // journey time
        const activeJourneyTime = setting.filter(
            (col) => col.visible && (col.id === 'journeyTime' || col.id === 'journeyTimeAcc'),
        );
        if (activeJourneyTime) {
            // preload journeyTime
            stopListData.forEach((stop) => getJourneyTime(String(stop.id)));
        }
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
            (marker.options.railwayFilterDir && marker.options.railwayFilterDir === 'UT')
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
                                text += ` (${eta.remark})`;
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
            (marker.options.railwayFilterDir && marker.options.railwayFilterDir === 'DT')
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
                                text += ` (${eta.remark})`;
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
                            line += `<span class="badge rounded-pill text-white me-1" style="background-color: ${getMtrColor('lr')};">${eta.platform ? eta.platform : ''}</span>`;
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

    updateSEO('stop', marker.options);
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
                    '{{href}}': getRouteUrl(route),
                    '{{backgroundColor}}': getMtrColor('route-hr', route.routeId),
                    '{{text}}': `${route.route} (${route.orig}↔️${route.dest})`,
                }).outerHTML;
            })
            .join('');
        reloadRouter();
    }
};
const triggerStopClick = async (stopId) => {
    markersLayer.eachLayer(function (layer) {
        if (layer.options.stop === stopId) {
            map.flyTo(layer.getLatLng(), stopZoomLevel);
            layer.openPopup();
        }
    });

    const setting = JSON.parse(localStorage.getItem('stopListRow'));
    const activeJourneyTime = setting.filter(
        (col) => col.visible && (col.id === 'journeyTime' || col.id === 'journeyTimeAcc'),
    );
    if (activeJourneyTime.length === 0 || !Array.isArray(stopListData) || stopListData.length === 0) {
        return;
    }

    const currentIndex = stopListData.findIndex((stop) => String(stop.id) === stopId);
    if (currentIndex < 0) {
        return;
    }

    [
        ...document.querySelectorAll('.stopListRow:not(.header) .stopListJourneyTime'),
        ...document.querySelectorAll('.stopListRow:not(.header) .stopListJourneyTimeAcc'),
    ].forEach((el) => {
        el.textContent = '';
    });

    const routeSegments = stopListData.slice(currentIndex);
    const segmentTimes = await Promise.all(
        routeSegments.slice(0, -1).map(async (currentStop, index) => {
            const nextStop = routeSegments[index + 1];
            const seconds = Number((await getJourneyTime(currentStop.id, nextStop.id)) || 0);
            return { nextStop, seconds };
        }),
    );

    let cumulativeSeconds = 0;
    segmentTimes.forEach(({ nextStop, seconds }) => {
        const timeText = seconds > 0 ? `${Math.round(seconds / 60)}<small>分</small>` : '';
        const journeyTimeEl = stopList.querySelector(`.stopListJourneyTime[data-stop-id="${nextStop.id}"]`);
        if (journeyTimeEl) {
            journeyTimeEl.innerHTML = timeText;
        }

        if (cumulativeSeconds > 0) {
            cumulativeSeconds += 20; // estimates stop time per stop
        }
        cumulativeSeconds += seconds;
        const cumulativeText = cumulativeSeconds > 0 ? `${Math.round(cumulativeSeconds / 60)}<small>分</small>` : '';
        const journeyTimeAccEl = stopList.querySelector(`.stopListJourneyTimeAcc[data-stop-id="${nextStop.id}"]`);
        if (journeyTimeAccEl) {
            journeyTimeAccEl.innerHTML = cumulativeText;
        }
    });
};
const updateSEO = (type, json) => {
    const domain = 'https://siri-shortcut-hk-bus-eta.pages.dev';
    const sitename = '香港交通到站時間';
    const orig = json.orig ? json.orig : json.routeDesc.split('➡️')[0];
    const dest = json.dest ? json.dest : json.routeDesc.split('➡️')[1];

    let title = sitename;
    let description = `${getCompanyName(json.company)} ${json.route}，${json.company === 'mtr_hr' ? '來往' : '由'}${orig}至${dest}`;
    if (json.stopList) {
        description += '，途經';
        json.stopList.forEach((stop) => {
            description += `${stop.name}、`;
        });
    }
    const url = domain + window.location.pathname;
    let ldjson = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        url: domain,
        potentialAction: [
            {
                '@type': 'SearchAction',
                target: {
                    '@type': 'EntryPoint',
                    urlTemplate: domain + '/search?q={search_term_string}',
                },
                'query-input': 'required name=search_term_string',
            },
        ],
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: getCompanyName(json.company),
                item: domain + '/' + json.company,
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: json.route,
                item: domain + getRouteUrl(json),
            },
        ],
    };
    if (json.company === 'mtr_hr') {
        title = json.route + ' - ' + sitename;
    } else {
        title = json.route + ' 往' + dest + ' - ' + sitename;
    }
    if (type === 'stop') {
        title = json.name + ' - ' + title;
        ldjson.itemListElement.push({
            '@type': 'ListItem',
            position: 3,
            name: json.name,
            item: domain + getRouteUrl(json, true),
        });
    }

    // update
    document.title = title;
    document.querySelector('meta[property="og:title"]').content = title;
    document.querySelector('meta[name="twitter:title"]').content = title;
    document.querySelector('meta[name="description"]').content = description;
    document.querySelector('meta[property="og:description"]').content = description;
    document.querySelector('meta[name="twitter:description"]').content = description;
    document.querySelector('meta[property="og:url"]').content = url;
    document.querySelector('meta[name="twitter:url"]').content = url;
    document.querySelector('link[rel="canonical"]').content = url;
    document.querySelector('script[type="application/ld+json"]').innerHTML = JSON.stringify(ldjson);
};
const loadSettings = () => {
    const defaultSetting = {
        straightenLine: 'Y',
        stopListRow: JSON.stringify([
            { id: 'index', label: '序號', visible: true },
            { id: 'name', label: '站名', visible: true },
            { id: 'journeyTime', label: '各站車程', visible: false },
            { id: 'journeyTimeAcc', label: '累計車程', visible: true },
            { id: 'interchange', label: '轉乘', visible: true },
        ]),
    };

    for (let [key, value] of Object.entries(defaultSetting)) {
        const saved = localStorage.getItem(key);
        if (saved !== null) {
            if ('straightenLine' === key) {
                value = saved;
            } else if ('stopListRow' === key) {
                try {
                    const parsed = JSON.parse(saved);
                    // 驗證並合併設定（確保預設欄位定義存在）
                    const restored = [];
                    parsed.forEach((savedSetting) => {
                        const matched = JSON.parse(value).find((c) => c.id === savedSetting.id);
                        if (matched) {
                            restored.push({ ...matched, visible: savedSetting.visible });
                        }
                    });

                    // 補齊任何後續新增但 local 未記錄的欄位
                    JSON.parse(value).forEach((defaultSetting) => {
                        if (!restored.some((c) => c.id === defaultSetting.id)) {
                            restored.push({ ...defaultSetting });
                        }
                    });

                    value = JSON.stringify(restored);
                } catch (e) {
                    console.error('無法解析儲存的設定，將使用預設值', e);
                }
            }
        }
        localStorage.setItem(key, value);

        // update settings UI
        if ('straightenLine' === key) {
            settingStraightenLine.checked = value !== 'N';
        } else {
            settingStopListRow.innerHTML = '';
            JSON.parse(value).forEach((setting) => {
                settingStopListRow.insertAdjacentHTML(
                    'beforeend',
                    `<li class="list-group-item d-flex align-items-center">
                    <div class="drag-handle text-muted px-2 py-1"><i class="bi bi-list"></i></div>
                    <label class="form-check-label ms-2 flex-grow-1" for="settingStopList_${setting.id}">${setting.label}</label>
                    <div class="form-check form-switch mb-0">
                        <input class="form-check-input" type="checkbox" id="settingStopList_${setting.id}" ${setting.visible ? 'checked' : ''} data-id="${setting.id}">
                    </div>
                </li>`,
                );
            });
            settingStopListRow.querySelectorAll('input[data-id]').forEach((inputEl) => {
                inputEl.addEventListener('change', saveStopListRowSetting);
            });
        }
    }
};
const saveStopListRowSetting = () => {
    const saved = JSON.parse(localStorage.getItem('stopListRow'));
    const inputElList = [...settingStopListRow.querySelectorAll('input[data-id]')];
    inputElList.forEach((inputEl) => {
        const settingObject = saved.find((item) => item.id === inputEl.dataset.id);
        if (settingObject) {
            settingObject.visible = inputEl.checked;
        }
    });

    const newOrderIds = inputElList.map((item) => item.dataset.id);
    saved.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
    localStorage.setItem('stopListRow', JSON.stringify(saved));

    renderStopList();
};

// events
document.getElementById('btnSearch').onclick = searchRoute;
document.getElementById('routeInput').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        document.getElementById('btnSearch').click();
    }
});
document.getElementById('collapseOne').addEventListener('show.bs.collapse', () => {
    const activeTab = document.querySelector('#mainTab .active');
    if (activeTab == null) {
        Tab.getOrCreateInstance('#homeTab').show();
    }
});
document.querySelectorAll('#mainTab button').forEach((triggerEl) => {
    triggerEl.addEventListener('click', (event) => {
        Collapse.getInstance('#collapseOne').show();
    });
});
settingStraightenLine.addEventListener('input', (event) => {
    localStorage.setItem('straightenLine', event.target.checked ? 'Y' : 'N');
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
    zoomControl: false,
    layers: [topographicMapTiles, label],
});
const layerControl = L.control.layers(baseMaps, overlays, { hideSingleBase: true }).addTo(map);
L.control.zoom({ position: 'bottomright' }).addTo(map);
map.on('popupopen', openPopup);

// page init
fetch(SIRI_SHORTCUT_UPDATE_API)
    .then((response) => response.json())
    .then((data) => {
        document.getElementById('getSiriShortcut').setAttribute('href', data.url);
        document.getElementById('siriShortcutVersion').innerHTML = `(v${data.version})`;
    });
mtrHrData = await fetch(ROUTE_API.replace('{route}', 'mtr_hr')).then((response) => response.json());
loadSettings();
new Sortable(settingStopListRow, {
    handle: '.drag-handle',
    group: 'settingStopList',
    animation: 150,
    onEnd: saveStopListRowSetting,
});

// export
window.renderRoute = renderRoute;
window.routeTypeClick = routeTypeClick;
window.triggerStopClick = triggerStopClick;
window.alert = alert;
window.setActive = setActive;
