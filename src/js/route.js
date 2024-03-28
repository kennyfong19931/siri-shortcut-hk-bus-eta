const router = new Navigo('/');
import { utf8_to_b64 } from './util.js';

router
    .on('/:company/:route/:direction', function (params, query) {
        fetch(ROUTE_API.replace('{route}', params.data.route))
            .then((response) => response.json())
            .then((data) => {
                const route = data.filter(
                    (element) => element.company === params.data.company && element.dir === params.data.direction,
                );
                if (!route) {
                    alert(`Cannot find route ${params.data.route} !`, 'danger');
                    return;
                }
                renderRoute(null, utf8_to_b64(JSON.stringify(route[0])));
            })
            .catch(function (error) {
                console.log(error);
                alert(`Cannot find route ${route} !`, 'danger');
            });
    })
    .on('/:company/:route/:direction/:stop', function (params, query) {
        console.log('path = stop');
        console.log(params);
        console.log(query);
    })
    .on('*', function () {
        console.log('path = *');
    })
    .resolve();
