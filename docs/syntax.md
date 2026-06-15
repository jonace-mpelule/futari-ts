----
title: Futari Syntax
----

## Starting The Server

```ts
// index.ts
import { Server } from "futari";

const app = Server();

app.config({
  root: process.cwd(),
  port: 3000,
});

await app.serve(() => {
  console.log("server running");
});
```

## Routes

```ts
// src/routes/auth/+route.ts
import { DefRoute, Post, RouteHandler, Use, type MiddlewareContext } from "futari";

function requireJson({ req, res, next }: MiddlewareContext) {
  if (req.headers["content-type"] !== "application/json") {
    res.writeHead(415, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: "Unsupported Media Type" }));
    return;
  }

  return next();
}

@DefRoute()
export default class AuthRoute {
  @Post("/")
  @Use(requireJson)
  login = RouteHandler(async ({ req }) => {
    return {
      data: req.body,
    };
  });
}
```

## Middleware

Middleware is function-based in v1. A middleware receives `{ req, res, next }`.
Call `next()` to continue, `next(error)` to return a framework `500`, or end the
response yourself to stop the chain.

```ts
import type { MiddlewareContext } from "futari";

export async function auth({ req, res, next }: MiddlewareContext) {
  if (!req.headers.authorization) {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: "Unauthorized" }));
    return;
  }

  await next();
}
```
