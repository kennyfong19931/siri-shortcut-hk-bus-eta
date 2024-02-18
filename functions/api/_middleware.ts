// Respond to OPTIONS method
export async function onRequestOptions(context) {
    let headers = {
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
    };

    if (context.env.ENVIRONMENT === 'DEV') {
        headers['Access-Control-Allow-Origin'] = '*';
    }

    return new Response(null, {
        status: 204,
        headers: headers,
    });
}

// Set CORS to all /api responses
export async function onRequest(context) {
    const response = await context.next();

    if (context.env.ENVIRONMENT === 'DEV') {
        response.headers.set('Access-Control-Allow-Origin', '*');
    }

    return response;
}
