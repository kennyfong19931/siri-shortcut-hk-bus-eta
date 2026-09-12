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

export function getCompanyName(company) {
    switch (company) {
        case 'kmb':
            return '九巴';
        case 'ctb':
            return '城巴';
        case 'nwfb':
            return '新巴';
        case 'nlb':
            return '新大嶼山巴士';
        case 'gmb':
            return '小巴';
        case 'mtr':
            return '地鐵巴士';
        case 'mtr-hr':
            return '地鐵';
        case 'mtr-lr':
            return '輕鐵';
        default:
            return '';
    }
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

function computeDeflections(xy) {
    const n = xy.length;
    const segs = [];
    const lens = [];
    for (let i = 0; i < n - 1; i++) {
        const dx = xy[i + 1][0] - xy[i][0];
        const dy = xy[i + 1][1] - xy[i][1];
        segs.push([dx, dy]);
        lens.push(Math.hypot(dx, dy) || 1e-6);
    }
    const deflections = new Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) {
        const v1 = segs[i - 1];
        const v2 = segs[i];
        const l1 = lens[i - 1];
        const l2 = lens[i];
        const dot = (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2);
        const det = (v1[0] * v2[1] - v1[1] * v2[0]) / (l1 * l2);
        deflections[i] = Math.atan2(det, Math.min(1.0, Math.max(-1.0, dot))) * (180 / Math.PI);
    }
    return { deflections, segs, lens };
}

function projectPointOntoSegment(p, a, b) {
    const vx = b[0] - a[0];
    const vy = b[1] - a[1];
    const denom = vx * vx + vy * vy;
    if (denom < 1e-12) return [p[0], p[1]];
    const t = ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / denom;
    return [a[0] + t * vx, a[1] + t * vy];
}

function straightenSharpTurns(coords, params) {
    const pts = coords.map((p) => [...p]);
    const n = pts.length;
    if (n < 4 || !params.enableStage1) return { pts, replaced: [] };

    const lat0 = pts.reduce((acc, p) => acc + p[1], 0) / n;
    const scale_x = 111320 * Math.cos((lat0 * Math.PI) / 180);
    const scale_y = 110574;
    const xy = pts.map((p) => [(p[0] - pts[0][0]) * scale_x, (p[1] - pts[0][1]) * scale_y]);
    const { deflections, segs, lens } = computeDeflections(xy);
    const replaced = [];

    for (let c = 1; c < n - 1; c++) {
        const ang_c = Math.abs(deflections[c]);
        if (ang_c >= params.minCornerAngle && ang_c <= 165.0) {
            // Check if temporary bus bay
            let is_bus_bay = false;
            const u_in = [segs[c - 1][0] / lens[c - 1], segs[c - 1][1] / lens[c - 1]];
            for (let f = c + 2; f < Math.min(c + 7, segs.length); f++) {
                const u_f = [segs[f][0] / lens[f], segs[f][1] / lens[f]];
                if (u_in[0] * u_f[0] + u_in[1] * u_f[1] > 0.88) {
                    is_bus_bay = true;
                    break;
                }
            }
            if (is_bus_bay) continue;

            // Pre-turn kink
            if (c >= 2) {
                const chord = [xy[c][0] - xy[c - 2][0], xy[c][1] - xy[c - 2][1]];
                const chord_len = Math.hypot(chord[0], chord[1]);
                if (chord_len > 1.0) {
                    const u = [chord[0] / chord_len, chord[1] / chord_len];
                    const diff = [xy[c - 1][0] - xy[c - 2][0], xy[c - 1][1] - xy[c - 2][1]];
                    const cross = Math.abs(diff[0] * u[1] - diff[1] * u[0]);
                    if (
                        cross >= 0.5 &&
                        cross <= params.maxJogOffset &&
                        Math.abs(deflections[c - 1]) >= params.kinkThresh
                    ) {
                        const old_p = [...pts[c - 1]];
                        pts[c - 1] = projectPointOntoSegment(pts[c - 1], pts[c - 2], pts[c]);
                        replaced.push({
                            idx: c - 1,
                            oldPt: old_p,
                            newPt: [...pts[c - 1]],
                            reason: `Pre-turn kink before ${ang_c.toFixed(1)}° turn`,
                        });
                    }
                }
            }

            // Post-turn kink
            if (c <= n - 3) {
                const chord = [xy[c + 2][0] - xy[c][0], xy[c + 2][1] - xy[c][1]];
                const chord_len = Math.hypot(chord[0], chord[1]);
                if (chord_len > 1.0) {
                    const u = [chord[0] / chord_len, chord[1] / chord_len];
                    const diff = [xy[c + 1][0] - xy[c][0], xy[c + 1][1] - xy[c][1]];
                    const cross = Math.abs(diff[0] * u[1] - diff[1] * u[0]);
                    if (
                        cross >= 0.5 &&
                        cross <= params.maxJogOffset &&
                        Math.abs(deflections[c + 1]) >= params.kinkThresh
                    ) {
                        const old_p = [...pts[c + 1]];
                        pts[c + 1] = projectPointOntoSegment(pts[c + 1], pts[c], pts[c + 2]);
                        replaced.push({
                            idx: c + 1,
                            oldPt: old_p,
                            newPt: [...pts[c + 1]],
                            reason: `Post-turn kink after ${ang_c.toFixed(1)}° turn`,
                        });
                    }
                }
            }
        }
    }
    return { pts, replaced };
}

function removeRamps(coords, params) {
    const pts = coords.map((p) => [...p]);
    const n = pts.length;
    if (n < 5 || !params.enableStage2) return { pts, dropped: [] };

    const lat0 = pts.reduce((acc, p) => acc + p[1], 0) / n;
    const scale_x = 111320 * Math.cos((lat0 * Math.PI) / 180);
    const scale_y = 110574;
    const xy = pts.map((p) => [(p[0] - pts[0][0]) * scale_x, (p[1] - pts[0][1]) * scale_y]);
    const { deflections, segs, lens } = computeDeflections(xy);
    const droppedIndices = new Set();

    let i = 1;
    while (i < n - 2) {
        if (Math.abs(deflections[i]) >= params.entryTurnAngle) {
            const candidates = {};
            for (let pts_drop of [2, 3, 4, 5, 6]) {
                const j = i + pts_drop + 1;
                if (j >= n) continue;
                const chord = [xy[j][0] - xy[i][0], xy[j][1] - xy[i][1]];
                const chord_len = Math.hypot(chord[0], chord[1]);
                if (chord_len < 1.0) continue;
                const u = [chord[0] / chord_len, chord[1] / chord_len];

                const v_in = [segs[i - 1][0] / lens[i - 1], segs[i - 1][1] / lens[i - 1]];
                const dot_in = Math.min(1.0, Math.max(-1.0, v_in[0] * u[0] + v_in[1] * u[1]));
                const det_in = v_in[0] * u[1] - v_in[1] * u[0];
                const ang_in = Math.abs(Math.atan2(det_in, dot_in) * (180 / Math.PI));

                let ang_out = 0.0;
                if (j < segs.length) {
                    const v_out = [segs[j][0] / lens[j], segs[j][1] / lens[j]];
                    const dot_out = Math.min(1.0, Math.max(-1.0, u[0] * v_out[0] + u[1] * v_out[1]));
                    const det_out = u[0] * v_out[1] - u[1] * v_out[0];
                    ang_out = Math.abs(Math.atan2(det_out, dot_out) * (180 / Math.PI));
                }

                let max_dev = 0;
                for (let k = i + 1; k < j; k++) {
                    const diff = [xy[k][0] - xy[i][0], xy[k][1] - xy[i][1]];
                    const cross = Math.abs(diff[0] * u[1] - diff[1] * u[0]);
                    if (cross > max_dev) max_dev = cross;
                }

                if (
                    ang_in <= params.bridgeAngle &&
                    ang_out <= params.bridgeAngle &&
                    max_dev >= 1.0 &&
                    max_dev <= params.maxDeviation
                ) {
                    candidates[pts_drop] = { j, residual: ang_in + ang_out, max_dev };
                }
            }

            let chosen_j = null;
            if (Object.keys(candidates).length > 0) {
                // Progressive collinearity matching for 3, 4, 5, 6 points:
                if (candidates[3] && candidates[3].residual < 1.0) {
                    chosen_j = candidates[3].j;
                } else if (
                    candidates[4] &&
                    candidates[4].residual < 1.0 &&
                    (!candidates[3] || candidates[3].residual >= 1.2)
                ) {
                    chosen_j = candidates[4].j;
                } else if (
                    candidates[5] &&
                    candidates[5].residual < 1.0 &&
                    (!candidates[4] || candidates[4].residual >= 1.2)
                ) {
                    chosen_j = candidates[5].j;
                } else if (
                    candidates[6] &&
                    candidates[6].residual < 1.0 &&
                    (!candidates[5] || candidates[5].residual >= 1.2)
                ) {
                    chosen_j = candidates[6].j;
                } else if (
                    candidates[4] &&
                    candidates[4].residual <= 2.5 &&
                    (!candidates[3] || candidates[3].residual > candidates[4].residual)
                ) {
                    chosen_j = candidates[4].j;
                } else if (candidates[3] && candidates[3].residual <= 2.5) {
                    chosen_j = candidates[3].j;
                } else if (candidates[6] && candidates[6].residual <= 2.5) {
                    chosen_j = candidates[6].j;
                } else {
                    const sorted = Object.values(candidates).sort((a, b) => a.residual - b.residual);
                    chosen_j = sorted[0].j;
                }
            }

            if (chosen_j !== null) {
                for (let k = i + 1; k < chosen_j; k++) droppedIndices.add(k);
                i = chosen_j;
            } else {
                i++;
            }
        } else {
            i++;
        }
    }

    const cleaned = pts.filter((_, idx) => !droppedIndices.has(idx));
    return { pts: cleaned, dropped: Array.from(droppedIndices) };
}

export function processFullGeometry(coordinates) {
    const params = {
        enableStage1: true,
        minCornerAngle: 35,
        kinkThresh: 12,
        maxJogOffset: 4.5,
        enableStage2: true,
        entryTurnAngle: 14,
        bridgeAngle: 8,
        maxDeviation: 8.5,
    };

    let totalOrig = 0;
    let totalClean = 0;
    let totalProjected = 0;
    let totalRemoved = 0;

    const allModifications = [];
    const newLines = [];
    for (let sIdx = 0; sIdx < coordinates.length; sIdx++) {
        const orig = coordinates[sIdx];
        totalOrig += orig.length;
        // Stage 1: Corridor Bus Bay Removal
        const s2 = removeRamps(orig, params);
        totalRemoved += s2.dropped.length;
        // Stage 2: Sharp Angle Straightening
        const s1 = straightenSharpTurns(s2.pts, params);
        totalProjected += s1.replaced.length;
        newLines.push(s1.pts);
        totalClean += s1.pts.length;
        allModifications.push({ segIdx: sIdx + 1, replaced: s1.replaced, dropped: s2.dropped, orig });
    }

    return {
        newLines: newLines,
        stats: { totalOrig, totalClean, totalProjected, totalRemoved },
        modifications: allModifications,
    };
}
