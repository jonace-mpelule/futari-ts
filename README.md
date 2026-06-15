# Futari

Futari is a Bun-first TypeScript backend framework built around file-based routing, decorator-driven route definitions, and a generated runtime manifest. You organize route classes under `src/routes`, build the manifest, and start a plain Node HTTP server that resolves requests against that generated route table.

This README is intended for framework users: how to create a project, how the runtime works, how to define routes and middleware, and what behavior is currently implemented in this repository.

## Table of Contents

- [What Futari gives you](#what-futari-gives-you)
- [Requirements](#requirements)
- [Create a project](#create-a-project)
- [How a Futari app starts](#how-a-futari-app-starts)
- [Project structure](#project-structure)
- [Routing model](#routing-model)
- [Your first route](#your-first-route)
- [Request and response model](#request-and-response-model)
- [Middleware](#middleware)
- [Behaviors](#behaviors)
- [Authentication and authorization](#authentication-and-authorization)
- [Rate limiting](#rate-limiting)
- [Payload validation](#payload-validation)
- [Proxy routes](#proxy-routes)
- [Response helpers](#response-helpers)
- [Logging](#logging)
- [Build and runtime flow](#build-and-runtime-flow)
- [CLI usage](#cli-usage)
- [Scripts](#scripts)
- [Known limitations](#known-limitations)
- [Additional docs](#additional-docs)

## What Futari gives you

- File-based route discovery from `src/routes/**/+route.ts`
- Decorator-based route methods like `@Get`, `@Post`, `@Patch`, and `@Delete`
- Dynamic route segments using directory names like `[id]`
- Per-route middleware with `@Use(...)`
- Route behaviors for payload validation, JWT auth, guards, rate limiting, proxying, and logging
- JSON response defaults through `RouteHandler(...)`
- A scaffold CLI with `create-futari`
- A generated `.futari/manifest.js` so runtime request matching does not need to rescan the filesystem

## Requirements

- [Bun](https://bun.sh/) for running apps, tests, and the scaffolded project scripts
- TypeScript 5+
- Decorators enabled in your app `tsconfig.json`

The scaffolded app already includes the relevant TypeScript compiler options.

## Create a project

Use the bundled scaffold CLI:

```bash
create-futari my-app
```

Then install dependencies and start the app:

```bash
cd my-app
bun install
bun run dev
```

The generated starter includes:

- `src/index.ts` for server bootstrap
- `src/routes/health/+route.ts` as a starter route
- `tsconfig.json` with decorator metadata enabled
- `package.json` with `dev`, `build`, `start`, and `typecheck` scripts

## How a Futari app starts

A Futari application has two phases:

1. Build the route manifest from your `src/routes` tree.
2. Start the HTTP server using that manifest.

The standard bootstrap looks like this:

```ts
import { Server } from "futari";

const app = Server();

app.config({
  root: process.cwd(),
  port: 3000,
});

await app.serve(() => {
  console.log("Futari server running on http://localhost:3000");
});
```

For local development, the scaffold uses:

```json
{
  "scripts": {
    "dev": "bun run src/index.ts --build",
    "build": "bun run src/index.ts --build",
    "start": "bun run src/index.ts"
  }
}
```

That matters because:

- `--build` triggers Futari's manifest generation
- `start` expects `.futari/manifest.js` to already exist
- if the manifest is missing, the server exits with an error asking you to build first

## Project structure

A typical Futari app should look like this:

```text
my-app/
  src/
    index.ts
    routes/
      health/
        +route.ts
      users/
        [id]/
          +route.ts
  .futari/
    manifest.js
    chunks/
  package.json
  tsconfig.json
```

Key conventions:

- Route files must be named `+route.ts`
- Route files must live under `src/routes`
- Each route file must default-export a class
- That class must be decorated with `@DefRoute()`
- Directory names define the base URL path
- Dynamic path segments use `[paramName]`, which become `:paramName` internally

Examples:

- `src/routes/health/+route.ts` becomes `/health`
- `src/routes/users/[id]/+route.ts` becomes `/users/:id`

## Routing model

Futari combines the directory path and the decorator path on the handler.

If your file is:

```text
src/routes/users/[id]/+route.ts
```

and your handler is:

```ts
@Get("/")
```

the final route becomes:

```text
/users/:id
```

If the same class also has:

```ts
@Post("/reset-password")
```

the final route becomes:

```text
/users/:id/reset-password
```

Supported route decorators:

- `@Get(path)`
- `@Post(path)`
- `@Put(path)`
- `@Patch(path)`
- `@Delete(path)`
- `@Head(path)`
- `@Options(path)`
- `@Connect(path)`
- `@Trace(path)`

## Your first route

```ts
import { DefRoute, Get, RouteHandler, Status } from "futari";

@DefRoute()
export default class HealthRoute {
  @Get("/")
  health = RouteHandler(async () => {
    return {
      status: "ok",
      code: Status.OK,
    };
  });
}
```

Notes:

- `@DefRoute()` is required on the default-exported class
- `RouteHandler(...)` wraps your handler and sends JSON automatically
- the returned object is serialized as the response body
- default success status is `200` unless you override it in `RouteHandler(...)`

## Request and response model

Handlers receive a context object:

```ts
type Context = {
  req: Request;
  res: Response;
  next?: Next;
  auth?: AuthState;
  bouncer?: Bouncer;
  logger?: FutariLogger;
};
```

Useful request fields:

- `req.body`: parsed JSON body for `POST`, `PUT`, and `PATCH` requests
- `req.params`: route params extracted from dynamic segments
- `req.query`: query string values

Example:

```ts
import { DefRoute, Get, RouteHandler } from "futari";

@DefRoute()
export default class UserRoute {
  @Get("/")
  show = RouteHandler(async ({ req }) => {
    return {
      params: req.params,
      query: req.query,
    };
  });
}
```

For a request to:

```text
/users/user-1?tab=profile&tag=a&tag=b
```

you receive:

```json
{
  "params": { "id": "user-1" },
  "query": {
    "tab": "profile",
    "tag": ["a", "b"]
  }
}
```

## Middleware

Middleware is function-based and attached to a route handler with `@Use(...)`.

```ts
import {
  DefRoute,
  Get,
  RouteHandler,
  Use,
  type MiddlewareContext,
} from "futari";

function requireAuth({ req, res, next }: MiddlewareContext) {
  if (!req.headers.authorization) {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: "Unauthorized" }));
    return;
  }

  return next();
}

@DefRoute()
export default class ProfileRoute {
  @Get("/")
  @Use(requireAuth)
  show = RouteHandler(async () => {
    return { ok: true };
  });
}
```

Middleware rules:

- middleware receives `{ req, res, next }`
- call `await next()` to continue to the next middleware or the handler
- write and end the response yourself to stop the chain
- throw an error or call `next(error)` to trigger a framework `500`

Middleware execution is per-handler, not global in this repository.

## Behaviors

Behaviors are route-level or global runtime policies such as:

- payload validation
- rate limiting
- JWT authentication
- authorization guards
- proxying
- structured logging

You can attach them:

- globally through `app.config({ behaviors: ... })`
- per route with decorators like `@Payload`, `@RateLimit`, `@Guard`, `@Proxy`, or `@Behavior`

### Global behavior example

```ts
import { Server, jwt, winstonAdapter } from "futari";

const auth = jwt({ secret: "dev-secret", issuer: "my-app" });

const app = Server();

app.config({
  root: process.cwd(),
  port: 3000,
  behaviors: {
    jwt: auth.guard(false),
    logger: winstonAdapter(console),
  },
});

await app.serve();
```

Global and route-level guards are merged. Route-level config overrides other overlapping fields.

## Authentication and authorization

Futari includes an HMAC SHA-256 JWT helper and a simple bouncer-style authorization system.

### JWT setup

```ts
import { jwt } from "futari";

const authJwt = jwt({
  secret: "super-secret",
  issuer: "my-app",
  audience: "api-clients",
  expiresIn: 60 * 60,
});
```

You can sign tokens:

```ts
const token = await authJwt.sign({ sub: "user-1", role: "admin" });
```

And protect routes:

```ts
import { Behavior, DefRoute, Get, RouteHandler } from "futari";

@DefRoute()
export default class SecureRoute {
  @Get("/")
  @Behavior({
    jwt: authJwt.guard(),
  })
  show = RouteHandler(async ({ auth }) => {
    return {
      sub: auth?.payload.sub,
    };
  });
}
```

If authentication succeeds, `ctx.auth` is populated with:

- `user`
- `token`
- `payload`

If the bearer token is missing or invalid, Futari returns:

```json
{
  "message": "Unauthorized",
  "code": "UNAUTHORIZED"
}
```

### Authorization with `createBouncer`

```ts
import {
  Behavior,
  createBouncer,
  DefRoute,
  Get,
  Guard,
  RouteHandler,
} from "futari";

const bouncer = createBouncer().define("features.view", async (ctx) => {
  return ctx.auth?.payload.sub === "user-1";
});

@DefRoute()
export default class FeatureRoute {
  @Get("/secure")
  @Behavior({
    jwt: authJwt.guard(),
    bouncer,
  })
  @Guard(async (ctx) => {
    await ctx.bouncer?.authorize(ctx, "features.view");
    return true;
  })
  secure = RouteHandler(async ({ auth }) => {
    return {
      sub: auth?.payload.sub,
    };
  });
}
```

If a guard returns `false`, Futari responds with `403 Forbidden`.

## Rate limiting

Use `@RateLimit(...)` to apply per-route limits:

```ts
import { DefRoute, Get, RateLimit, RouteHandler } from "futari";

@DefRoute()
export default class FeatureRoute {
  @Get("/limited")
  @RateLimit({
    limit: 5,
    windowMs: 60_000,
    key: ({ req }) => req.headers["x-api-key"]?.toString() ?? "anonymous",
  })
  limited = RouteHandler(async () => {
    return { ok: true };
  });
}
```

When the limit is exceeded, Futari returns `429` with a JSON body like:

```json
{
  "message": "Too Many Requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "limit": 5,
  "remaining": 0,
  "resetAt": 1710000000000,
  "retryAfter": 60
}
```

You can also provide a custom store by implementing the `RateLimitStore` contract.

## Payload validation

Use `@Payload(schema)` when you want route-level request validation and normalization.

The schema contract is intentionally simple: any object with a `safeParse(input)` function that returns a success or failure result with `issues`/`errors`.

```ts
import { DefRoute, Payload, Post, RouteHandler } from "futari";

const payloadSchema = {
  safeParse(input: unknown) {
    if (
      typeof input === "object" &&
      input !== null &&
      "name" in input &&
      typeof input.name === "string"
    ) {
      return {
        success: true as const,
        data: {
          name: input.name.trim(),
        },
      };
    }

    return {
      success: false as const,
      error: {
        issues: [
          {
            path: ["name"],
            message: "Expected string",
          },
        ],
      },
    };
  },
};

@DefRoute()
export default class FeatureRoute {
  @Post("/payload")
  @Payload(payloadSchema)
  payload = RouteHandler(async ({ req }) => {
    return {
      body: req.body,
    };
  });
}
```

On success:

- `req.body` is replaced with the parsed `data`

On failure:

- Futari returns `422 Unprocessable Entity`
- the response includes `message`, `code`, and `issues`

Example failure payload:

```json
{
  "message": "Payload validation failed",
  "code": "PAYLOAD_VALIDATION_FAILED",
  "issues": [
    {
      "path": ["name"],
      "message": "Expected string"
    }
  ]
}
```

## Proxy routes

Use `@Proxy(...)` when a route should forward the request to another upstream.

```ts
import { DefRoute, Post, Proxy, RouteHandler } from "futari";

@DefRoute()
export default class ForwardRoute {
  @Post("/proxy")
  @Proxy({
    target: "https://upstream.example.com/api",
    rewrite: () => "/forwarded",
    timeout: 1_000,
    headers: {
      "x-futari-proxy": "yes",
    },
  })
  proxy = RouteHandler(async () => {
    return { unreachable: true };
  });
}
```

Behavior notes:

- the original method is forwarded
- the query string is preserved
- request headers are forwarded
- for non-`GET` and non-`HEAD` requests, the parsed body is forwarded
- if proxying succeeds, the upstream response is written directly
- if proxying fails, Futari returns `502 Bad Gateway`

## Response helpers

You can either return data from `RouteHandler(...)` or write the response yourself using helper functions.

Available helpers:

- `json(res, data, status?, headers?)`
- `text(res, body, status?, headers?)`
- `redirect(res, location, status?)`
- `empty(res, status?, headers?)`

Example:

```ts
import {
  DefRoute,
  Get,
  empty,
  json,
  redirect,
  text,
  type Context,
} from "futari";

@DefRoute()
export default class HelloRoute {
  @Get("/json-helper")
  jsonHelper = async ({ res }: Context) => {
    json(res, { helper: "json" }, 201);
  };

  @Get("/text-helper")
  textHelper = async ({ res }: Context) => {
    text(res, "plain text");
  };

  @Get("/redirect-helper")
  redirectHelper = async ({ res }: Context) => {
    redirect(res, "/hello");
  };

  @Get("/empty-helper")
  emptyHelper = async ({ res }: Context) => {
    empty(res);
  };
}
```

## Logging

Futari can emit behavior-level logs through a pluggable logger interface:

```ts
import { winstonAdapter } from "futari";

const logger = winstonAdapter(console);
```

or:

```ts
import { bunyanAdapter } from "futari";

const logger = bunyanAdapter(console);
```

Attach the logger globally:

```ts
app.config({
  root: process.cwd(),
  port: 3000,
  behaviors: {
    logger,
  },
});
```

Current log hooks include events such as:

- `request:start`
- `payload:invalid`
- `rate_limit:exceeded`
- `auth:jwt_invalid`
- `proxy:success`
- `proxy:error`

## Build and runtime flow

Futari does not resolve routes directly from source files on every request. It builds a manifest first.

What happens during build:

1. Futari scans `src/routes`
2. It looks for every `+route.ts`
3. It validates that each file default-exports a class decorated with `@DefRoute()`
4. It bundles the route files into `.futari/chunks`
5. It generates `.futari/manifest.js` with the final route table, middlewares, and behaviors

What happens at runtime:

1. `app.serve()` loads `.futari/manifest.js`
2. Futari matches the request path and method
3. Futari parses JSON bodies for `POST`, `PUT`, and `PATCH`
4. Futari executes global and route behaviors
5. Futari runs route middleware
6. Futari invokes the bound handler

This is why `bun run dev` in the scaffold includes `--build`.

## CLI usage

Scaffold a project:

```bash
create-futari my-app
```

Scaffold into an existing non-empty directory:

```bash
create-futari my-app --force
```

CLI usage:

```text
create-futari <project-name> [--force]
```

## Scripts

In this framework repository:

```bash
bun install
bun run build
bun run typecheck
bun run lint
bun test
```

In a scaffolded Futari app:

```bash
bun install
bun run dev
bun run build
bun run start
bun run typecheck
```

## Known limitations

These are important if you are adopting the framework as it exists in this repository today.

- Request body parsing is currently JSON-only and only runs for `POST`, `PUT`, and `PATCH`
- malformed JSON returns `400 { "message": "Malformed JSON body" }`
- route-level middleware is implemented; there is no global middleware registration API documented in this repo
- the runtime requires a generated `.futari/manifest.js`; starting without it fails
- routing uses exact segment counts, so there is no catch-all or wildcard routing shown here
- query parameters are parsed as `string | string[]`
- the config type exposes `cors` and `compressionEnabled`, but the runtime path in this repository is centered on `root`, `port`, and optional `behaviors`; document and use the confirmed runtime behavior accordingly

## Additional docs

- [docs/syntax.md](./docs/syntax.md) for a shorter syntax reference
- [docs/middleware-manifest.md](./docs/middleware-manifest.md) for how middleware is preserved in the generated manifest

## Development on this repository

If you are contributing to Futari itself rather than consuming it in an app:

- framework source lives in `src/`
- the scaffold CLI lives in `src/cli/`
- runtime behavior is covered by `tests/futari.test.ts`
- example route fixtures live under `tests/examples/app`
