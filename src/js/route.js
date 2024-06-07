const router = new Navigo('/');
window.addEventListener('load', () => {
    router
        .on('/:company/:routeId', function (params, query) {
            /*
                Possible routes:
                /mtr_hr/:route
             */
            handleRoute({
                company: params.data.company,
                routeId: params.data.routeId,
            });
        })
        .on('/:company/:route/:param1', function (params, query) {
            /*
                Possible routes:
                /kmb/:route/:dir
                /ctb/:route/:dir
                /nlb/:route/:routeId
                /gmb/:route/:routeId
                /mtr/:route/:dir
                /mtr_hr/:routeId/:stop
                /mtr_lr/:routeId/:dir
             */
            let param = {};
            if ('mtr_hr' === params.data.company) {
                param.routeId = params.data.route;
                param.stop = params.data.param1;
            } else if ('nlb' === params.data.company || 'gmb' === params.data.company) {
                param.route = params.data.route;
                param.routeId = params.data.param1;
            } else {
                param.route = params.data.route;
                param.dir = params.data.param1;
            }
            handleRoute({
                company: params.data.company,
                ...param,
            });
        })
        .on('/:company/:route/:param1/:stop', function (params, query) {
            /*
                Possible routes:
                /kmb/:route/:dir/:stop
                /ctb/:route/:dir/:stop
                /nlb/:route/:routeId/:stop
                /gmb/:route/:routeId/:stop
                /mtr/:route/:dir/:stop
                /mtr_lr/:routeId/:dir/:stop
             */
            let param = {};
            if ('nlb' === params.data.company || 'gmb' === params.data.company) {
                param.routeId = params.data.param1;
            } else {
                param.dir = params.data.param1;
            }
            handleRoute({
                company: params.data.company,
                route: params.data.route,
                stop: params.data.stop,
                ...param,
            });
        })
        .resolve();
});

function handleRoute(inputData) {
    fetch(ROUTE_API.replace('{route}', inputData.route))
        .then((response) => response.json())
        .then((data) => {
            const routeArray = data.filter(
                (element) =>
                    element.company === (inputData.company === 'nwfb' ? 'ctb' : inputData.company) &&
                    (inputData.dir ? element.dir === inputData.dir : true) &&
                    (inputData.routeId ? element.routeId === inputData.routeId : true),
            );
            if (!routeArray) {
                alert(`Cannot find route ${inputData.route} !`, 'danger');
                return;
            }
            renderRoute(routeArray[0]);
            if (inputData.stop) {
                triggerStopClick(inputData.stop);
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
    } else if ('nlb' === data.company || 'gmb' === data.company) {
        return `/${data.company}/${data.route}/${data.routeId}${withStop ? '/' + data.stop : ''}`;
    } else {
        return `/${data.company}/${data.route}/${data.dir}${withStop ? '/' + data.stop : ''}`;
    }
}

function reloadRouter() {
    router.updatePageLinks();
}

// export
window.reloadRouter = reloadRouter;
window.getRouteUrl = getRouteUrl;
