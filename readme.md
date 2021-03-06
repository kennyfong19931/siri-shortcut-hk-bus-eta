[![Github Action](https://github.com/kennyfong19931/siri-shortcut-hk-bus-eta/workflows/Update%20Data/badge.svg)](https://github.com/kennyfong19931/siri-shortcut-hk-bus-eta/actions)

# 巴士到站時間預報

使用[資料一線通](https://data.gov.hk/)提供的API, 透過 Siri shortcut 查詢到站時間預報

### 支援的巴士公司
- [九巴/龍運](https://data.gov.hk/tc-data/dataset/hk-td-tis_21-etakmb)
- [城巴](https://data.gov.hk/tc-data/dataset/ctb-eta-transport-realtime-eta)
- [新巴](https://data.gov.hk/tc-data/dataset/nwfb-eta-transport-realtime-eta)
- [嶼巴](https://data.gov.hk/tc-data/dataset/nlb-bus-nlb-bus-service)
- [專線小巴](https://data.gov.hk/tc-data/dataset/hk-td-sm_7-real-time-arrival-data-of-gmb)
- [港鐵巴士](https://data.gov.hk/tc-data/dataset/mtr-mtr_bus-mtr-bus-eta-data)

![群組查詢功能](/image/group_query.gif)

### 簡化版

#### 使用方法:
先查詢需要的路線，然後打開最近搜尋記錄

將需要的路線加入簡化版的列表內

簡化版中含有102線作例子

![簡化版設定](/image/simplify_setup.gif)
![喂 Siri 執行簡化版](/image/simplify_demo_hey_siri.gif)

# Development
## Install depedency
`npm install`

## Start Dev server for Cloudflare function
`npm run dev`
