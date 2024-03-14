import fetch from 'node-fetch';
import fs from 'fs';

const requestObj = {};
const doRequest = async (body) => {
    return fetch('http://127.0.0.1:8788/api/eta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then((res) => res.json());
};

beforeAll(() => {
    // prepare requestObj
    // kmb, ctb, nlb, gmb
    const route1File = fs.readFileSync('./public/api/route/1.json', 'utf8');
    const route1 = JSON.parse(route1File);
    for (const route of route1) {
        requestObj[route.company] = {
            company: route.company,
            routeId: route.routeId,
            stop: route.stopList[1].id,
            routeType: route.routeType,
            dir: route.dir,
        };
    }

    // nwfb, for backward compatibility
    const route101File = fs.readFileSync('./public/api/route/1.json', 'utf8');
    const route101 = JSON.parse(route101File);
    for (const route of route101) {
        if (route.company === 'ctb') {
            requestObj['nwfb'] = {
                company: 'nwfb',
                routeId: route.routeId,
                stop: route.stopList[1].id,
                dir: route.dir,
            };
        }
    }

    // mtr
    const routeK12File = fs.readFileSync('./public/api/route/K12.json', 'utf8');
    const routeK12 = JSON.parse(routeK12File);
    for (const route of routeK12) {
        requestObj[route.company] = {
            company: route.company,
            routeId: route.routeId,
            stop: route.stopList[1].id,
            dir: route.dir,
        };
    }

    // mtr_hr
    const routeMtrHrFile = fs.readFileSync('./public/api/route/mtr_hr.json', 'utf8');
    const routeMtrHr = JSON.parse(routeMtrHrFile);
    for (const route of routeMtrHr) {
        requestObj[route.company] = {
            company: route.company,
            routeId: route.routeId,
            stop: route.stopList[1].id,
            dir: 'DT',
        };
    }

    // mtr_lr
    const route610File = fs.readFileSync('./public/api/route/610.json', 'utf8');
    const route610 = JSON.parse(route610File);
    for (const route of route610) {
        requestObj[route.company] = {
            company: route.company,
            routeId: route.routeId,
            stop: route.stopList[1].id,
            dir: route.dir,
        };
    }
});

describe('Common', () => {
    test('Request Body is not array', async () => {
        return doRequest({}).then((json: any) => {
            expect(json.error).toBe('Invalid parameter');
        });
    });

    test('Request Body is empty', async () => {
        return doRequest([{}]).then((json: any) => {
            expect(json.error).toMatch(/Missing parameter/);
        });
    });

    test('Check Missing param - company', async () => {
        return doRequest([{ routeId: 1, stop: 1 }]).then((json: any) => {
            expect(json.error).toMatch(/Missing parameter.*company/);
        });
    });

    test('Check Missing param - routeId', async () => {
        return doRequest([{ company: 'nlb', stop: 1 }]).then((json: any) => {
            expect(json.error).toMatch(/Missing parameter.*routeId/);
        });
    });

    test('Check Missing param - stop', async () => {
        return doRequest([{ company: 'nlb', routeId: 1 }]).then((json: any) => {
            expect(json.error).toMatch(/Missing parameter.*stop/);
        });
    });

    test('Check Invlid param - company', async () => {
        return doRequest([{ company: 'A', routeId: 1, stop: 1 }]).then((json: any) => {
            expect(json.error).toMatch('Invalid parameter. company not found');
        });
    });
});

describe('KMB', () => {
    test('Check Missing param - routeType', async () => {
        return doRequest([{ company: 'kmb', routeId: 1, stop: '1', dir: '1' }]).then((json: any) => {
            expect(json.error).toMatch(/Missing parameter.*routeType/);
        });
    });

    test('Check Missing param - dir', async () => {
        return doRequest([{ company: 'kmb', routeId: 1, routeType: 1, stop: '1' }]).then((json: any) => {
            expect(json.error).toMatch(/Missing parameter.*dir/);
        });
    });

    test('Call ETA API', async () => {
        return doRequest([requestObj['kmb']]).then((json: any) => {
            expect(json[0]).toBeInstanceOf(Array);
            expect(json[0][0].eta).toBeGreaterThanOrEqual(-1);
        });
    });
});

describe('CTB', () => {
    test('Check Missing param - dir', async () => {
        return doRequest([{ company: 'kmb', routeId: 1, stop: '1' }]).then((json: any) => {
            expect(json.error).toMatch(/Missing parameter.*dir/);
        });
    });

    test('Call ETA API', async () => {
        return doRequest([requestObj['ctb']]).then((json: any) => {
            expect(json[0]).toBeInstanceOf(Array);
            expect(json[0][0].eta).toBeGreaterThanOrEqual(-1);
        });
    });
});

describe('NWFB', () => {
    test('Check Missing param - dir', async () => {
        return doRequest([{ company: 'nwfb', routeId: 1, stop: '1' }]).then((json: any) => {
            expect(json.error).toMatch(/Missing parameter.*dir/);
        });
    });

    test('Call ETA API', async () => {
        return doRequest([requestObj['nwfb']]).then((json: any) => {
            expect(json[0]).toBeInstanceOf(Array);
            expect(json[0][0].eta).toBeGreaterThanOrEqual(-1);
        });
    });
});

describe('NLB', () => {
    test('Call ETA API', async () => {
        return doRequest([requestObj['nlb']]).then((json: any) => {
            expect(json[0]).toBeInstanceOf(Array);
            expect(json[0][0].eta).toBeGreaterThanOrEqual(-1);
        });
    });
});

describe('GMB', () => {
    test('Check Missing param - routeType', async () => {
        return doRequest([{ company: 'gmb', routeId: 1, stop: '1' }]).then((json: any) => {
            expect(json.error).toMatch(/Missing parameter.*routeType/);
        });
    });

    test('Call ETA API', async () => {
        return doRequest([requestObj['gmb']]).then((json: any) => {
            expect(json[0]).toBeInstanceOf(Array);
            expect(json[0][0].eta).toBeGreaterThanOrEqual(-1);
        });
    });
});

describe('MTR', () => {
    test('Call ETA API', async () => {
        return doRequest([requestObj['mtr']]).then((json: any) => {
            expect(json[0]).toBeInstanceOf(Array);
            expect(json[0][0].eta).toBeGreaterThanOrEqual(-1);
        });
    });
});

describe('MTR_HR', () => {
    test('Check Missing param - dir', async () => {
        return doRequest([{ company: 'mtr_hr', routeId: 1, stop: '1' }]).then((json: any) => {
            expect(json.error).toMatch(/Missing parameter.*dir/);
        });
    });

    test('Call ETA API', async () => {
        return doRequest([requestObj['mtr_hr']]).then((json: any) => {
            expect(json[0]).toBeInstanceOf(Array);
            expect(json[0][0].eta).toBeGreaterThanOrEqual(-1);
        });
    });
});

describe('MTR_LR', () => {
    test('Check Missing param - dir', async () => {
        return doRequest([{ company: 'mtr_lr', routeId: 1, stop: '1' }]).then((json: any) => {
            expect(json.error).toMatch(/Missing parameter.*dir/);
        });
    });

    test('Call ETA API', async () => {
        return doRequest([requestObj['mtr_lr']]).then((json: any) => {
            expect(json[0]).toBeInstanceOf(Array);
            expect(json[0][0].eta).toBeGreaterThanOrEqual(-1);
        });
    });
});

test('Call multiple ETA', async () => {
    return doRequest(Object.values(requestObj)).then((json: any) => {
        expect(json[0]).toBeInstanceOf(Array);
        expect(json[0][0].eta).toBeGreaterThanOrEqual(-1);
    });
});
