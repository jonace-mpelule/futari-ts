import { beforeAll, describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import path from "node:path";
import { pathToFileURL } from "node:url";
import BuildManifest from "../src/fn/buildManifest";
import handleServer from "../src/fn/handleServer";
import { jwt } from "../src/fn/jwt";
import { winstonAdapter } from "../src/fn/logger";
import type { BehaviorConfig } from "../src/types/behavior.t";
import type { Request, Response } from "../src/types/network";
import type { RuntimeRoutes } from "../src/types/runtime.t";

const fixtureRoot = path.resolve("tests/examples/app");
let routes: RuntimeRoutes[] = [];

class MockRequest extends EventEmitter {
	method: string;
	url: string;
	headers: Record<string, string>;
	__meta!: Request["__meta"];
	body?: unknown;
	params!: Request["params"];
	query!: Request["query"];

	constructor({
		method,
		url,
		headers,
	}: {
		method: string;
		url: string;
		headers?: Record<string, string>;
	}) {
		super();
		this.method = method;
		this.url = url;
		this.headers = headers ?? {};
	}
}

class MockResponse {
	statusCode = 200;
	headers = new Map<string, string>();
	body = "";
	writableEnded = false;

	writeHead(
		statusCode: number,
		headers?: Record<string, string | number | string[]>,
	) {
		this.statusCode = statusCode;
		for (const [key, value] of Object.entries(headers ?? {})) {
			this.headers.set(
				key.toLowerCase(),
				Array.isArray(value) ? value.join(", ") : String(value),
			);
		}
		return this;
	}

	end(chunk?: string) {
		if (chunk) this.body += chunk;
		this.writableEnded = true;
		return this;
	}
}

async function request(
	method: string,
	routePath: string,
	body?: string,
	headers?: Record<string, string>,
	behaviors?: BehaviorConfig,
) {
	const req = new MockRequest({
		method,
		url: routePath,
		headers,
	});
	const res = new MockResponse();
	const promise = handleServer({
		req: req as unknown as Request,
		res: res as unknown as Response,
		routes,
		behaviors,
	});

	queueMicrotask(() => {
		if (body) req.emit("data", Buffer.from(body));
		req.emit("end");
	});

	await promise;
	let parsedBody: unknown;
	try {
		parsedBody = res.body ? JSON.parse(res.body) : undefined;
	} catch {
		parsedBody = undefined;
	}

	return {
		response: {
			status: res.statusCode,
			headers: {
				get: (key: string) => res.headers.get(key.toLowerCase()) ?? null,
			},
		},
		body: parsedBody,
		text: res.body,
	};
}

describe("futari core runtime", () => {
	beforeAll(async () => {
		await BuildManifest(fixtureRoot);
		const manifestPath = path.join(fixtureRoot, ".futari", "manifest.js");
		const manifest = await import(
			`${pathToFileURL(manifestPath).href}?t=${Date.now()}`
		);
		routes = manifest.default.routes;
	});

	test("manifest includes GET routes and function middleware", () => {
		const indexRoute = routes.find((route) => route.path === "/hello");

		expect(indexRoute?.method).toBe("GET");
		expect(indexRoute?.middlewares).toHaveLength(1);
		expect(typeof indexRoute?.handler).toBe("function");
		expect(typeof indexRoute?.middlewares[0]).toBe("function");
	});

	test("runs middleware before a GET route and ignores query strings", async () => {
		const { response, body } = await request("GET", "/hello?from=test");

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("application/json");
		expect(body).toEqual({
			message: "hello",
			middlewareOrder: ["first"],
		});
	});

	test("parses JSON bodies for POST routes", async () => {
		const { response, body } = await request(
			"POST",
			"/hello/echo",
			JSON.stringify({ name: "Futari" }),
			{ "content-type": "application/json" },
		);

		expect(response.status).toBe(200);
		expect(body).toEqual({
			body: { name: "Futari" },
		});
	});

	test("returns 400 for malformed JSON", async () => {
		const { response, body } = await request("POST", "/hello/echo", "{", {
			"content-type": "application/json",
		});

		expect(response.status).toBe(400);
		expect(body).toEqual({ message: "Malformed JSON body" });
	});

	test("returns 404 for unknown paths", async () => {
		const { response, body } = await request("GET", "/missing");

		expect(response.status).toBe(404);
		expect(body).toEqual({ message: "Route Not Found" });
	});

	test("returns 405 for known paths with unsupported methods", async () => {
		const { response, body } = await request("DELETE", "/hello");

		expect(response.status).toBe(405);
		expect(body).toEqual({ message: "Method Not Allowed" });
	});

	test("returns one clean 500 response for route exceptions", async () => {
		const { response, body } = await request("GET", "/hello/boom");

		expect(response.status).toBe(500);
		expect(body).toEqual({ message: "Internal Server Error" });
	});

	test("extracts route params and parsed query values", async () => {
		const { response, body } = await request(
			"GET",
			"/users/user-1?tab=profile&tag=a&tag=b",
		);

		expect(response.status).toBe(200);
		expect(body).toEqual({
			params: { id: "user-1" },
			query: {
				tab: "profile",
				tag: ["a", "b"],
			},
		});
	});

	test("response helpers send json, text, redirects, and empty responses", async () => {
		const jsonResult = await request("GET", "/hello/json-helper");
		expect(jsonResult.response.status).toBe(201);
		expect(jsonResult.body).toEqual({ helper: "json" });
		expect(jsonResult.response.headers.get("content-type")).toContain(
			"application/json",
		);

		const textResult = await request("GET", "/hello/text-helper");
		expect(textResult.response.status).toBe(200);
		expect(textResult.response.headers.get("content-type")).toContain(
			"text/plain",
		);
		expect(textResult.text).toBe("plain text");

		const redirectResult = await request("GET", "/hello/redirect-helper");
		expect(redirectResult.response.status).toBe(302);
		expect(redirectResult.response.headers.get("location")).toBe("/hello");

		const emptyResult = await request("GET", "/hello/empty-helper");
		expect(emptyResult.response.status).toBe(204);
		expect(emptyResult.text).toBe("");
	});

	test("payload guard validates and enriches invalid responses", async () => {
		const valid = await request(
			"POST",
			"/features/payload",
			JSON.stringify({ name: " Futari " }),
			{ "content-type": "application/json" },
		);
		expect(valid.response.status).toBe(200);
		expect(valid.body).toEqual({ body: { name: "Futari" } });

		const invalid = await request(
			"POST",
			"/features/payload",
			JSON.stringify({ name: 1 }),
			{ "content-type": "application/json" },
		);
		expect(invalid.response.status).toBe(422);
		expect(invalid.body).toEqual({
			message: "Payload validation failed",
			code: "PAYLOAD_VALIDATION_FAILED",
			issues: [
				{
					path: ["name"],
					message: "Expected string",
					code: "invalid_type",
					expected: "string",
					received: "object",
				},
			],
		});
	});

	test("rate limit blocks requests after the configured limit", async () => {
		const first = await request("GET", "/features/limited");
		expect(first.response.status).toBe(200);

		const second = await request("GET", "/features/limited");
		expect(second.response.status).toBe(429);
		expect(second.body).toMatchObject({
			message: "Too Many Requests",
			code: "RATE_LIMIT_EXCEEDED",
			limit: 1,
			remaining: 0,
		});
	});

	test("logger adapter receives request and validation events", async () => {
		const logs: Array<{ level: string; message: string }> = [];
		const logger = winstonAdapter({
			info: (message: string) => logs.push({ level: "info", message }),
			warn: (message: string) => logs.push({ level: "warn", message }),
		});

		await request(
			"POST",
			"/features/payload",
			JSON.stringify({ name: 1 }),
			{ "content-type": "application/json" },
			{ logger },
		);

		expect(logs).toContainEqual({ level: "info", message: "request:start" });
		expect(logs).toContainEqual({ level: "warn", message: "payload:invalid" });
	});

	test("proxy forwards method, query, headers, and body", async () => {
		const originalFetch = globalThis.fetch;
		let received:
			| {
					url: string;
					method?: string;
					body?: unknown;
					header?: string | null;
			  }
			| undefined;

		globalThis.fetch = (async (
			input: Parameters<typeof fetch>[0],
			init?: Parameters<typeof fetch>[1],
		) => {
			received = {
				url: input.toString(),
				method: init?.method,
				body: init?.body ? JSON.parse(String(init.body)) : undefined,
				header: init?.headers
					? new Headers(init.headers).get("x-futari-proxy")
					: null,
			};
			return new Response(JSON.stringify({ proxied: true }), {
				status: 202,
				headers: {
					"content-type": "application/json",
				},
			});
		}) as typeof fetch;

		try {
			const result = await request(
				"POST",
				"/features/proxy?trace=1",
				JSON.stringify({ hello: "world" }),
				{ "content-type": "application/json" },
			);

			expect(result.response.status).toBe(202);
			expect(result.body).toEqual({ proxied: true });
			expect(received).toEqual({
				url: "https://upstream.test/api/forwarded?trace=1",
				method: "POST",
				body: { hello: "world" },
				header: "yes",
			});
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test("jwt auth attaches ctx.auth and bouncer authorizes requests", async () => {
		const service = jwt({ secret: "test-secret", issuer: "futari-test" });
		const validToken = await service.sign({ sub: "user-1" });
		const valid = await request("GET", "/features/secure", undefined, {
			authorization: `Bearer ${validToken}`,
		});
		expect(valid.response.status).toBe(200);
		expect(valid.body).toEqual({ sub: "user-1" });

		const invalidUserToken = await service.sign({ sub: "user-2" });
		const forbidden = await request("GET", "/features/secure", undefined, {
			authorization: `Bearer ${invalidUserToken}`,
		});
		expect(forbidden.response.status).toBe(403);

		const unauthorized = await request("GET", "/features/secure");
		expect(unauthorized.response.status).toBe(401);
	});
});
