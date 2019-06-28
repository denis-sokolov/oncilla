import { createServer } from "http";
import Koa from "koa";

const app = new Koa();

app.use((ctx, next) => {
  console.error("HTTP request", ctx.method, ctx.path, "from", ctx.ip);
  return next();
});

app.use((ctx, next) => {
  if (ctx.path === "/robots.txt" && ctx.method === "GET") {
    ctx.body = "Disallow: /\n";
    return;
  }
  if (ctx.path === "/status" && ctx.method === "GET") {
    ctx.body = "I seem healthy.\n";
    return;
  }
  return next();
});

export function makeServer() {
  return createServer(app.callback());
}
