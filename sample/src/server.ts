import { makeServer } from "./http";
import { attachWebSockets } from "./sample";

async function start(port: number) {
  const server = makeServer();
  await attachWebSockets(server);

  server.listen(port, function() {
    console.error("Listening on port", port);
  });
}

start(8020);
