import type WebSocket from "ws";

export function heartbeat(getClients: () => Set<WebSocket>) {
  function setGood(this: any) {
    this.lifeFlag = "good";
  }
  setInterval(function ping() {
    getClients().forEach(
      (socket: WebSocket & { lifeFlag?: "good" | "sleepy" }) => {
        if (socket.lifeFlag === undefined) {
          socket.lifeFlag = "good";
          socket.on("pong", setGood);
          socket.on("message", setGood);
          return;
        }
        if (socket.lifeFlag === "good") {
          socket.lifeFlag = "sleepy";
          socket.ping();
          return;
        }
        if (socket.lifeFlag === "sleepy") {
          socket.terminate();
          return;
        }
      }
    );
  }, 60000);
}
