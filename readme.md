[![Update Data](https://github.com/kennyfong19931/siri-shortcut-hk-bus-eta/actions/workflows/updateRoute.yml/badge.svg)](https://github.com/kennyfong19931/siri-shortcut-hk-bus-eta/actions/workflows/updateRoute.yml)
[![Update Spatial](https://github.com/kennyfong19931/siri-shortcut-hk-bus-eta/actions/workflows/updateSpatial.yml/badge.svg)](https://github.com/kennyfong19931/siri-shortcut-hk-bus-eta/actions/workflows/updateSpatial.yml)
[![Build Web](https://github.com/kennyfong19931/siri-shortcut-hk-bus-eta/actions/workflows/buildWeb.yml/badge.svg)](https://github.com/kennyfong19931/siri-shortcut-hk-bus-eta/actions/workflows/buildWeb.yml)
[![Postman](https://img.shields.io/badge/Postman-API%20doc-FF6C37?logo=postman&logoColor=white)](https://www.postman.com/crimson-spaceship-895558/workspace/siri-shortcut-hk-bus-eta/documentation/20883356-482dee34-62b2-48c3-b84d-31039fc26c44)

# ![簡化版設定](/public/img/favicon-32x32.png) 巴士到站時間預報
使用[資料一線通](https://data.gov.hk/)及其他資料來源, 透過 Siri shortcut 或網頁查詢到站時間預報。

### 支援的交通工具
#### 巴士
- [九巴/龍運](https://data.gov.hk/tc-data/dataset/hk-td-tis_21-etakmb)
- [城巴](https://data.gov.hk/tc-data/dataset/ctb-eta-transport-realtime-eta)
- ~~[新巴](https://data.gov.hk/tc-data/dataset/nwfb-eta-transport-realtime-eta)~~ 已於2023年7月1日與城巴合併
- [嶼巴](https://data.gov.hk/tc-data/dataset/nlb-bus-nlb-bus-service-v2)
- [專線小巴](https://data.gov.hk/tc-data/dataset/hk-td-sm_7-real-time-arrival-data-of-gmb)
- [港鐵巴士](https://data.gov.hk/tc-data/dataset/mtr-mtr_bus-mtr-bus-eta-data)
#### 鐵路
- [港鐵](https://data.gov.hk/tc-data/dataset/mtr-data2-nexttrain-data)
- [輕鐵](https://data.gov.hk/tc-data/dataset/mtr-lrnt_data-light-rail-nexttrain-data)

### 使用說明
請到[Wiki](../../wiki)查看

### 其他資料來源
#### 地圖
- [地形圖](https://portal.csdi.gov.hk/csdi-webpage/apidoc/TopographicMapAPI)
- [影像地圖](https://portal.csdi.gov.hk/csdi-webpage/apidoc/ImageryMapAPI)
- [地名標籤](https://portal.csdi.gov.hk/csdi-webpage/apidoc/MapLabelAPI)
#### 路線資料
- [巴士路線](https://portal.csdi.gov.hk/geoportal/?datasetId=td_rcd_1638844988873_41214&lang=en)
- [巴士/鐵路路線](https://wiki.openstreetmap.org/wiki/Hong_Kong/Transport/Routes)

# Development
## Install depedency
`npm install`

## Start Dev server for API
`npm run dev`

## Start Dev server for Web
`npm run web-start`
