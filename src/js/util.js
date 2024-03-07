export function utf8_to_b64(str) {
    return window.btoa(encodeURIComponent(str));
}

export function b64_to_utf8(str) {
    return decodeURIComponent(window.atob(str));
}

export function getCompanyImage(company) {
    if ('mtr_hr' === company) {
        company = 'mtr';
    }
    return `/img/${company}.svg`;
}

export function getHtmlTemplate(templateId, param = {}) {
    let template = document.createElement('template');
    let html = document.querySelector(`template#${templateId}`).innerHTML;
    for (let key in param) {
        html = html.replaceAll(key, param[key]);
    }
    template.innerHTML = html.trim();
    return template.content.firstChild;
}

export function getCompanyColor(company, isPluse = false) {
    switch (company) {
        case 'kmb':
            return isPluse ? '#FFFFFF' : '#FF0000';
        case 'ctb':
            return isPluse ? '#0080FF' : '#F9BF00';
        case 'nwfb':
            return isPluse ? '#7000CC' : '#EF7925';
        case 'nlb':
            return isPluse ? '#3DC9B4' : '#2A897B';
        case 'gmb':
            return isPluse ? '#53B776' : '#337149';
        case 'mtr':
            return isPluse ? '#53B776' : '#1A81FF';
    }
    return '#000';
}
export function getMtrColor(type, value) {
    if (type === 'route-hr') {
        switch (value) {
            case 'TWL':
                return '#ff0000';
            case 'KTL':
                return '#1a9431';
            case 'ISL':
                return '#0860a8';
            case 'SIL':
                return '#b5bd00';
            case 'TKL':
                return '#6b208b';
            case 'AEL':
                return '#1c7670';
            case 'TCL':
                return '#fe7f1d';
            case 'DRL':
                return '#f550a6';
            case 'EAL':
                return '#5eb6e4';
            case 'TML':
                return '#9a3b26';
        }
    } else if (type === 'station-hr') {
        // https://zh.wikipedia.org/wiki/Template:%E6%B8%AF%E9%90%B5%E8%BB%8A%E7%AB%99%E9%A1%8F%E8%89%B2
        switch (value) {
            case 'CEN':
                return '#AA0000';
            case 'ADM':
                return '#3A86D4';
            case 'TST':
                return '#FFEF00';
            case 'JOR':
                return '#69B72B';
            case 'YMT':
                return '#CCCCCC';
            case 'MOK':
                return '#BE2700';
            case 'PRE':
                return '#8674A1';
            case 'SSP':
                return '#016258';
            case 'CSW':
                return '#B5A265';
            case 'LCK':
                return '#E04300';
            case 'MEF':
                return '#1E90FF';
            case 'LAK':
                return '#BB2200';
            case 'KWF':
                return '#233D3A';
            case 'KWH':
                return '#F1CC00';
            case 'TWH':
                return '#A2B741';
            case 'TSW':
                return '#BB2200';
            case 'WHA':
                return '#AECFF0';
            case 'HOM':
                return '#A2CF5A';
            case 'SKM':
                return '#669933';
            case 'KOT':
                return '#007FFF';
            case 'LOF':
                return '#579E2F';
            case 'WTS':
                return '#FFFF00';
            case 'DIH':
                return '#000000';
            case 'CHH':
                return '#27408B';
            case 'KOB':
                return '#C80815';
            case 'NTK':
                return '#92B6A3';
            case 'KWT':
                return '#FFFFFF';
            case 'LAT':
                return '#0083BE';
            case 'YAT':
                return '#FFEF00';
            case 'TIK':
                return '#DCD144';
            case 'KET':
                return '#95D0D0';
            case 'HKU':
                return '#B8DA89';
            case 'SYP':
                return '#8B7BA0';
            case 'SHW':
                return '#FFD280';
            case 'WAC':
                return '#E1EB2B';
            case 'CAB':
                return '#C8A2C8';
            case 'TIH':
                return '#FF7D00';
            case 'FOH':
                return '#4B8842';
            case 'NOP':
                return '#E86220';
            case 'QUB':
                return '#00918C';
            case 'TAK':
                return '#BB2200';
            case 'SWH':
                return '#FFCC00';
            case 'SKW':
                return '#191970';
            case 'HFC':
                return '#C01204';
            case 'CHW':
                return '#38510E';
            case 'TKO':
                return '#E60012';
            case 'HAH':
                return '#2EA9DF';
            case 'POA':
                return '#F28500';
            case 'LHP':
                return '#826F79';
            case 'HOK':
                return '#FFFAFA';
            case 'KOW':
                return '#ACA28A';
            case 'OLY':
                return '#4584C4';
            case 'NAC':
                return '#F0EE86';
            case 'TSY':
                return '#A1C6CA';
            case 'SUN':
                return '#808080';
            case 'TUC':
                return '#6A5ACD';
            case 'DIS':
                return '#005533';
            case 'AIR':
                return '#808080';
            case 'AWE':
                return '#FFFFFF';
            case 'EXC':
                return '#94A8B0';
            case 'HUH':
                return '#F08080';
            case 'MKK':
                return '#006400';
            case 'TAW':
                return '#05117E';
            case 'SHT':
                return '#BB7796';
            case 'FOT':
                return '#FFA500';
            case 'RAC':
                return '#15AE69';
            case 'UNI':
                return '#A2D7DD';
            case 'TAP':
                return '#976E9A';
            case 'TWO':
                return '#C89F05';
            case 'FAN':
                return '#9ACD32';
            case 'SHS':
                return '#F6A600';
            case 'LOW':
                return '#8DC476';
            case 'LMC':
                return '#009E9B';
            case 'WKS':
                return '#954535';
            case 'MOS':
                return '#E0B0FF';
            case 'HEO':
                return '#87CEFA';
            case 'TSH':
                return '#48D1CC';
            case 'SHM':
                return '#FBEC5D';
            case 'CIO':
                return '#FFBF00';
            case 'STW':
                return '#FFC0CB';
            case 'CKT':
                return '#FFD280';
            case 'HIK':
                return '#8FBE6C';
            case 'KAT':
                return '#FF8C00';
            case 'SUW':
                return '#D08A00';
            case 'TKW':
                return '#A9E2F3';
            case 'ETS':
                return '#FFFF00';
            case 'AUS':
                return '#B45529';
            case 'TWW':
                return '#A81C07';
            case 'KSR':
                return '#CC5500';
            case 'YUL':
                return '#40F5F5';
            case 'LOP':
                return '#FFB3BF';
            case 'TIS':
                return '#FC8A17';
            case 'SIH':
                return '#7FFFD4';
            case 'TUM':
                return '#035F94';
            case 'OCP':
                return '#00BFFF';
            case 'WCH':
                return '#FFFF00';
            case 'LET':
                return '#FF7F00';
            case 'SOH':
                return '#74B11B';
            case 'TCT':
                return '#274060';
            case 'NPT':
                return '#274060';
            case 'WEK':
                return '#808080';
        }
    } else if (type === 'lr') {
        return '#d3a809';
    } else if (type === 'route-lr') {
        // https://zh.wikipedia.org/wiki/Template:%E8%BC%95%E9%90%B5%E9%A1%8F%E8%89%B2
        switch (value) {
            case '505':
                return '#b53533';
            case '506P':
                return '#000';
            case '507':
            case '507P':
                return '#009651';
            case '610':
                return '#3d1f1b';
            case '610P':
                return '#4dc6f4';
            case '614':
                return '#51b5dc';
            case '614P':
                return '#d98386';
            case '615':
                return '#f9db4f';
            case '615P':
                return '#235970';
            case '705':
                return '#7eb554';
            case '706':
                return '#9f73a0';
            case '751':
                return '#d87f3f';
            case '751P':
                return '#000';
            case '761P':
                return '#592d76';
        }
    }
    return '#000';
}

export function getMtrTextColor(type, value) {
    if (type === 'station-hr') {
        const blackStationList = [
            'TST',
            'YMT',
            'CSW',
            'KWH',
            'WHA',
            'HOM',
            'LOF',
            'WTS',
            'KWT',
            'LAT',
            'YAT',
            'TIK',
            'KET',
            'HKU',
            'SYP',
            'WAC',
            'CAB',
            'TIH',
            'NOP',
            'SWH',
            'HAH',
            'POA',
            'HOK',
            'KOW',
            'OLY',
            'NAC',
            'TSY',
            'TUC',
            'DIS',
            'AIR',
            'AWE',
            'HUH',
            'MOS',
            'HEO',
            'TSH',
            'SHM',
            'CIO',
            'STW',
            'CKT',
            'KAT',
            'SUW',
            'TKW',
            'ETS',
            'YUL',
            'LOP',
            'TIS',
            'SIH',
            'WCH',
            'WEK',
        ];
        if (blackStationList.includes(value)) {
            return '#000';
        } else if (value === 'SHW') {
            return '#6B4513';
        } else if (value === 'SUN') {
            return '#C0C0C0';
        } else if (value === 'DIS') {
            return '#D4AF37';
        } else if (value === 'HIK') {
            return '#182F4F';
        }
    }
    return '#FFF';
}

export function getPageWidth() {
    return Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.offsetWidth,
        document.documentElement.clientWidth,
    );
}
