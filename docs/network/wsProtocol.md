# Oncilla WebSocket protocol

This is the protocol of synchronizing data entities over WebSocket messages.

The core benefit of the protocol is resolving most kinds of conflicts on the client-side, keeping the server-side simple.

## Data entities

Every data entity in the system has a `kind`, an `id`, a `revision`, and a `value`.

**Kind** A specific application using this protocol has a closed set of kinds, which helps to statically type values.

**Id** A free-form string field to identify an instance of a particular kind. For singletons of a particular kind an id of "singleton" is recommended.

**Revision** A free-form string field the server uses to reject client writes when the client is not up to date. A lazy or an unfinished server implementation may ignore this field and always set it to an empty string.

**Value** The actual business value of the entity. The field is defined in application domain, and can be an object, a list, a string, a number, or even a boolean.

## Meta

The communication begins when the client opens a connection to a predefined WebSocket URL. There is currently no designed activity at the start of the connection.

All messages sent back or forth are JSON objects, stringified to UTF-8. The only required field is `action`, identifying the meaning of the message.

All messages must be self-contained. This means it is safe to assume most messages may be sent and received in any order.

## Ping

The WebSockets will automatically close on the server when the client is gone, but the opposite is, unfortunately, not always true. Because our client-side applications need to show offline status, we must implement this at the application level.

The client decides when it wants to check for connectivity and sends a `ping` message to the server. The server must immediately respond with a `pong` message:

```json
{
  "action": "ping"
}

{
  "action": "pong"
}
```

## Pushing the data to the client

The server may push any data to the client it deems necessary with an `update` message. The client must treat these messages idempotently and expect them at any time.

```json
{
  "action": "update",
  "id": "",
  "kind": "",
  "revision": "",
  "value": {}
}
```

## Retrieving the data

The client expresses an intent to receive messages about a particular domain entity with a `subscribe` message with `kind` and `id` fields.

The general expectation of a subscription is that the server will immediately queue sending an `update` message with the current version of the entity, and will keep sending further `update` messages whenever anything changes about this domain entity.

A client must not send a duplicate `subscribe` in the same session.

The server may, however, decide to send fewer update messages than there are updates. (And even more, duplicates are not problematic)

```json
{
  "action": "subscribe",
  "kind": "",
  "id": ""
}
```

## Updating the data

The client expresses an intent to change the data with a `push` message, with `kind`, `id`, and `value`, but also `lastSeenRevision` and `pushId`.

**lastSeenRevision** A verbatim string value of the `revision` field of the latest update of the entity the client has. To be able to perform an update, the client must have first seen a domain entity in an update from the server. Updates without seeing previous versions are disallowed. To create an item that did not exist before, send special string `creating-new-item` as lastSeenRevision.

**pushId** A unique-per-connection push id string, generated on the client. The client can use this field as described later.

```json
{
  "action": "push",
  "kind": "",
  "id": "",
  "lastSeenRevision": "",
  "value": {},
  "pushId": ""
}
```

Upon receiving a push message, the server should validate whether the lastSeenRevision field matches the current server-side canon version of the entity.

If the lastSeenRevision is valid, the server should save the new revision of the entity.

To be able to provide optimistic UI updates with real-time server-side updates, the client needs to know when a particular push has been accepted by the server. In order to do that, for every received push message the server must send a `pushResult` message to the client with `pushId`, `result`, and possibly `newRevision` and `newValue` fields.

**pushId** A verbatim string copy of the field in the client’s push message.

**result** If the write succeeded the `result` field must be `"success"`, if the write was rejected because lastSeenRevision was out of date, the field must be `"conflict"`, and if the write was rejected because of internal errors, the field must be `"internalError"`.

**newRevision** If the write succeeded the `newRevision` contains the newest revision number of the entity.

**newValue** If the write succeeded the `newValue` contains the newest value of the entity.

```json
{
  "action": "pushResult",
  "pushId": "",
  "result": "success",
  "newRevision": "2",
  "newValue": {}
}
```

## Authentication

Oncilla supports a first class `auth` action, designed to establish an initial/ongoing authenticated websocket session with the server. The message is structured as follows:

```json
{
  "action": "auth",
  "token": ""
}
```

The purpose of this action is to establish/re-establish authentication with the Server.

The server may respond with an `authResult` message:

```json
{
  "action": "authResult",
  "result": ""
}
```

Oncilla is indifferent to both the authentication mechanism and value contained in the field, leaving the verification up to the server implementation. A good example of a payload of `token` is a [JWT token](https://jwt.io/).

## Errors

The server may choose to provide a debugging message to the client. This message is meant for developers, and UI apps should probably crash with a user-friendly message.

```json
{
  "type": "clientError",
  "message": "Incorrect call to foo"
}
```

## Limitations

Lost WebSocket messages are not handled in this version.
