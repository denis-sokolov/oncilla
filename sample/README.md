# Sample Backend Implementation

This service is a sample implementation of a WebSocket server which can handle
incoming messages from Oncilla. It can be used as a development aid while implementing changes in Oncilla.

## Setup

1. Run `npm install`
2. Run `npm run start-server`
3. From a WebSocket client, e.g. [Simple WebSocket Client](https://chrome.google.com/webstore/detail/simple-websocket-client/pfdhoblngboilpfeibdedpjgfnlcodoo?hl=en) connect to `localhost:8020`.
4. Send a sample message, such as:

```json
{
  "action": "ping"
}
```

Expected Response:

```json
{
  "action": "pong"
}
```
