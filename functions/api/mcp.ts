import { jsonRpcResponse } from '../../src/utils/jsonResponse';
import { getEta } from './eta';

function mcpHeaders(headers = {}) {
    return {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type, mcp-protocol-version',
        'access-control-max-age': '86400',
        ...headers,
    };
}

function getToolList() {
    return [
        {
            name: 'get-route',
            description:
                'Get route detail with route number, Avaliable transport: bus, minibus, mtr (use `mtr_hr` as input), light rail. Return list of route with company, route, routeType, dir, orig, dest, stopList, routeId, description. stopList is a list of stop with id, name, lat, long.',
            inputSchema: {
                type: 'object',
                properties: {
                    routeNo: {
                        type: 'string',
                        description: 'Route Number',
                    },
                },
                required: ['routeNo'],
                additionalProperties: false,
            },
            annotations: { readOnlyHint: true },
        },
        {
            name: 'get-eta',
            description:
                'Get ETA (Estimated Time of Arrival) from a stop, parameters can retrive from `get-route`. Return eta in minutes and remark for special information.',
            inputSchema: {
                type: 'object',
                properties: {
                    company: {
                        type: 'string',
                        description: 'company retrive from `get-route`',
                    },
                    routeId: {
                        type: 'string',
                        description: 'routeId retrive from `get-route`',
                    },
                    stop: {
                        type: 'string',
                        description: 'stop retrive from `get-route`',
                    },
                    routeType: {
                        type: 'string',
                        description: 'routeType retrive from `get-route`',
                    },
                    dir: {
                        type: 'string',
                        description:
                            'dir retrive from `get-route`. Special case: when company is `mtr_hr`, use `UT` as value if travel from `orig` to `dest`, use `DT` as value if travel from `dest` to `orig`.',
                    },
                    route: {
                        type: 'string',
                        description: 'route retrive from `get-route`',
                    },
                },
                required: ['company', 'routeId', 'stop'],
                additionalProperties: true,
            },
            annotations: { readOnlyHint: true },
        },
    ];
}

function callTool(env, toolName, arguments) {
    if (toolName === 'get-eta') {
        return getEta(arguments, env);
    }
    throw new Error('Unknown tool');
}

export async function onRequestOptions() {
    return new Response(null, { status: 204, headers: mcpHeaders() });
}

export async function onRequestPost({ request, env, ctx }) {
    const requestBody = await request.json();
    const id = requestBody.id ?? null;
    const method = requestBody.method ?? null;
    const params = requestBody.params ?? {};

    if (method === null) return jsonRpcResponse({ error: 'Invalid Request' }, { status: 400 });
    if (method === 'notifications/initialized') {
        return new Response(null, { status: 202, headers: mcpHeaders() });
    }
    if (method === 'initialize') {
        const response = {
            protocolVersion: '2025-03-26',
            capabilities: {
                tools: { listChanged: false },
                resources: { subscribe: false, listChanged: false },
                prompts: { listChanged: false },
            },
            serverInfo: {
                name: 'hk-transport-eta',
                version: '1.0.0',
            },
        };
        return jsonRpcResponse(id, response);
    }
    if (method === 'ping') {
        return jsonRpcResponse(id, {}, 200);
    }
    if (method === 'tools/list') {
        return jsonRpcResponse(id, { tools: getToolList() });
    }
    if (method === 'tools/call') {
        const toolName = params.name ?? 'unknown_tool';
        try {
            const responseJson = await callTool(env, toolName, params.arguments);
            return jsonRpcResponse(
                id,
                {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(responseJson),
                        },
                    ],
                    structuredContent: responseJson,
                }
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Tool call failed';
            const status = message === 'Unknown tool' ? 404 : 400;
            jsonRpcResponse(
                {
                    error: message,
                    data: {
                        tool: toolName,
                        detail: message,
                    },
                },
                { status: status },
            );
        }
    }

    return jsonRpcResponse({ error: 'Method not found' }, { status: 404 });
}
