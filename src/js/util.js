export function utf8_to_b64(str) {
    return window.btoa(encodeURIComponent(str));
}

export function b64_to_utf8(str) {
    return decodeURIComponent(window.atob(str));
}

export function getCompanyImage(company) {
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
            return isPluse ? "#FFFFFF" : "#FF0000";
        case 'ctb':
            return isPluse ? "#0080FF" : "#F9BF00";
        case 'nwfb':
            return isPluse ? "#7000CC" : "#EF7925";
        case 'nlb':
            return isPluse ? "#3DC9B4" : "#2A897B";
        case 'gmb':
            return isPluse ? "#53B776" : "#337149";
        case 'mtr':
            return isPluse ? "#53B776" : "#1A81FF";
    }
    return "#000";
}
export function getMtrHrColor(route) {
    switch (route) {
        case 'TWL':
            return "#ff0000";
        case 'KTL':
            return "#1a9431";
        case 'ISL':
            return "#0860a8";
        case 'SIL':
            return "#b5bd00";
        case 'TKL':
            return "#6b208b";
        case 'AEL':
            return "#1c7670";
        case 'TCL':
            return "#fe7f1d";
        case 'DRL':
            return "#f550a6";
        case 'EAL':
            return "#5eb6e4";
        case 'TML':
            return "#9a3b26";
        case 'WRL':
            return "#a40084";
    }
    return "#000";
}

export function getPageWidth() {
    return Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.offsetWidth,
        document.documentElement.clientWidth
    );
}