const router = new Navigo('/');
window.addEventListener('load', () => {
    router
        .on('/:company/:routeId', function ({ data }) {
            /*
                Possible routes:
                /mtr_hr/:route
             */
            handleRoute({
                company: data.company,
                routeId: data.routeId,
            });
        })
        .on('/:company/:route/:param1', function ({ data }) {
            /*
                Possible routes:
                /kmb/:route/:dir
                /ctb/:route/:dir
                /nlb/:route/:routeId
                /mtr_hr/:routeId/:stop
                /mtr_lr/:routeId/:dir
             */
            let param = {};
            if ('mtr_hr' === data.company) {
                param.routeId = data.route;
                param.stop = data.param1;
            } else if ('nlb' === data.company) {
                param.route = data.route;
                param.routeId = data.param1;
            } else {
                param.route = data.route;
                param.dir = data.param1;
            }
            handleRoute({
                company: data.company,
                ...param,
            });
        })
        .on('/:company/:route/:param1/:stop', function ({ data }) {
            /*
                Possible routes:
                /kmb/:route/:dir/:stop
                /ctb/:route/:dir/:stop
                /nlb/:route/:routeId/:stop
                /gmb/:route/:routeId/:routeType
                /mtr/:route/:routeId/:routeType
                /mtr_lr/:routeId/:dir/:stop
             */
            let param = {};
            if ('nlb' === data.company) {
                param.routeId = data.param1;
                param.stop = data.stop;
            } else if ('gmb' === data.company || 'mtr' === data.company) {
                param.routeId = data.param1;
                param.routeType = data.stop;
            } else {
                param.dir = data.param1;
                param.stop = data.stop;
            }
            handleRoute({
                company: data.company,
                route: data.route,
                ...param,
            });
        })
        .on('/:company/:route/:routeId/:routeType/:stop', function ({ data }) {
            /*
                Possible routes:
                /gmb/:route/:routeId/:routeType/:stop
                /mtr/:route/:routeId/:routeType/:stop
             */
            handleRoute({
                company: data.company,
                route: data.route,
                routeId: data.routeId,
                routeType: data.routeType,
                stop: data.stop,
            });
        })
        .on('/search', function ({ path, params }) {
            document.getElementById('routeInput').value = params.q;
            document.getElementById('btnSearch').click();
        })
        .resolve();
});

function handleRoute(inputData) {
    fetch(ROUTE_API.replace('{route}', 'mtr_hr' === inputData.company ? inputData.company : inputData.route))
        .then((response) => response.json())
        .then((data) => {
            const routeArray = data.filter(
                (element) =>
                    element.company === (inputData.company === 'nwfb' ? 'ctb' : inputData.company) &&
                    (inputData.dir ? element.dir === inputData.dir : true) &&
                    (inputData.routeId ? element.routeId === inputData.routeId || element.routeId === parseInt(inputData.routeId) : true) &&
                    (inputData.routeType ? element.routeType === inputData.routeType || element.routeType === parseInt(inputData.routeType) : true),
            );
            if (!routeArray) {
                alert(`Cannot find route ${inputData.route} !`, 'danger');
                return;
            }
            renderRoute(routeArray[0], inputData.stop !== undefined);
            if (inputData.stop) {
                triggerStopClick(inputData.company === 'gmb' ? parseInt(inputData.stop) : inputData.stop);
            }
        })
        .catch(function (error) {
            console.log(error);
            alert(`Cannot find route ${inputData.route} !`, 'danger');
        });
}

function getRouteUrl(data, withStop = false) {
    if ('mtr_hr' === data.company) {
        return `/${data.company}/${data.routeId}${withStop ? '/' + data.stop : ''}`;
    } else if ('nlb' === data.company) {
        return `/${data.company}/${data.route}/${data.routeId}${withStop ? '/' + data.stop : ''}`;
    } else if ('gmb' === data.company || 'mtr' === data.company) {
        return `/${data.company}/${data.route}/${data.routeId}/${data.routeType}${withStop ? '/' + data.stop : ''}`;
    } else {
        return `/${data.company}/${data.route}/${data.dir}${withStop ? '/' + data.stop : ''}`;
    }
}

function reloadRouter() {
    router.updatePageLinks();
}

function routeNavigate(route) {
    router.navigate(route);
}

// export
window.reloadRouter = reloadRouter;
window.getRouteUrl = getRouteUrl;
window.routeNavigate = routeNavigate;
