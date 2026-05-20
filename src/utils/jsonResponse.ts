export const jsonResponse = (value: any, init: ResponseInit = {}) =>
    new Response(JSON.stringify(value), {
        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            ...init.headers,
        },
        ...init,
    });

export const jsonRpcResponse = (id, result, status = 200) => {
    return jsonResponse({ jsonrpc: "2.0", id: id, result }, { status });
}
