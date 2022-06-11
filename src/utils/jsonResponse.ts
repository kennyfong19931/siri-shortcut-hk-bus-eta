export const jsonResponse = (value: any, init: ResponseInit = {}) =>
    new Response(JSON.stringify(value), {
        headers: { "Content-Type": "application/json;charset=UTF-8", ...init.headers },
        ...init,
    });