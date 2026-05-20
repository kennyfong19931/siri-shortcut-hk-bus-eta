---
name: get-eta
description: Gets ETA (Estimated Time of Arrival) for Hong Kong transport routes. Use when the user asks for real-time arrival information for buses, minibuses, MTR, or light rail.
license: MIT
---

# Get ETA for Hong Kong Transport Routes

Use this skill to get real-time arrival information for buses, minibuses, MTR, or light rail in Hong Kong. This skill provides estimated time of arrival (ETA) for various transport routes, helping users plan their journeys effectively.

## MCP
Read MCP server card at `/.well-known/mcp/server-card.json` for more details.

## Workflow

1. The user asks for the ETA of a specific bus, minibus, MTR, or light rail route in Hong Kong.
2. Use MCP `get-route` with the specified route to get the route list. Ask user to select the route if there are multiple routes. Each route contains a stop list, ask user to select the stop.
3. Use MCP `get-eta` with the selected route and stop to retrieve the estimated time of arrival for the transport route, include all information of the selected route and stop in the request body.
4. The skill processes the retrieved data and generates a response that includes the estimated time of arrival for the requested transport route.
