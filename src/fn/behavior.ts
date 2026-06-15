import { Status } from "../constants/httpStatus.constants";
import type {
	BehaviorConfig,
	GuardRule,
	PayloadIssue,
	ProxyOptions,
	RateLimitOptions,
	ResolvedBehaviorConfig,
} from "../types/behavior.t";
import type { Context, Request } from "../types/network";
import { createBouncer } from "./bouncer";
import { defaultRateLimitStore } from "./rateLimit";
import { json } from "./response";

type ExecuteBehaviorInput = {
	ctx: Context;
	global?: BehaviorConfig;
	route?: BehaviorConfig;
};

export type BehaviorExecutionResult = {
	shouldContinue: boolean;
	behavior: ResolvedBehaviorConfig;
};

export async function executeBehaviors({
	ctx,
	global,
	route,
}: ExecuteBehaviorInput): Promise<BehaviorExecutionResult> {
	const behavior = mergeBehaviorConfig(global, route);
	ctx.logger = behavior.logger;
	ctx.bouncer = behavior.bouncer ?? ctx.bouncer ?? createBouncer();

	ctx.logger?.info?.("request:start", getRequestMeta(ctx.req));

	if (behavior.rateLimit && !(await applyRateLimit(ctx, behavior.rateLimit))) {
		return { shouldContinue: false, behavior };
	}

	if (behavior.jwt && !(await applyJwt(ctx, behavior))) {
		return { shouldContinue: false, behavior };
	}

	if (behavior.payload && !applyPayload(ctx, behavior.payload)) {
		return { shouldContinue: false, behavior };
	}

	if (!(await applyGuards(ctx, behavior.guards ?? []))) {
		return { shouldContinue: false, behavior };
	}

	if (behavior.proxy) {
		await applyProxy(ctx, behavior.proxy);
		return { shouldContinue: false, behavior };
	}

	return { shouldContinue: true, behavior };
}

export function mergeBehaviorConfig(
	global?: BehaviorConfig,
	route?: BehaviorConfig,
): ResolvedBehaviorConfig {
	return {
		...global,
		...route,
		guards: [...(global?.guards ?? []), ...(route?.guards ?? [])],
	};
}

function applyPayload(
	ctx: Context,
	payload: NonNullable<BehaviorConfig["payload"]>,
) {
	const result = payload.schema.safeParse(ctx.req.body);
	if (result.success) {
		ctx.req.body = result.data;
		return true;
	}

	const issues = normalizePayloadIssues(
		result.error.issues ?? result.error.errors ?? [],
	);
	ctx.logger?.warn?.("payload:invalid", {
		issues,
		...getRequestMeta(ctx.req),
	});
	json(
		ctx.res,
		{
			message: payload.options?.message ?? "Payload validation failed",
			code: "PAYLOAD_VALIDATION_FAILED",
			issues,
		},
		Status.UNPROCESSABLE_ENTITY,
	);
	return false;
}

async function applyRateLimit(ctx: Context, options: RateLimitOptions) {
	const key = options.key?.(ctx) ?? getClientIp(ctx.req);
	const store = options.store ?? defaultRateLimitStore;
	const result = await store.hit(key, options.limit, options.windowMs);

	if (result.allowed) return true;

	ctx.logger?.warn?.("rate_limit:exceeded", {
		key,
		...result,
		...getRequestMeta(ctx.req),
	});
	json(
		ctx.res,
		{
			message: "Too Many Requests",
			code: "RATE_LIMIT_EXCEEDED",
			limit: result.limit,
			remaining: result.remaining,
			resetAt: result.resetAt,
			retryAfter: result.retryAfter,
		},
		Status.TOO_MANY_REQUESTS,
		{
			"retry-after": result.retryAfter,
		},
	);
	return false;
}

async function applyJwt(ctx: Context, behavior: ResolvedBehaviorConfig) {
	const authHeader = ctx.req.headers.authorization;
	const token = Array.isArray(authHeader)
		? authHeader[0]?.replace(/^Bearer\s+/i, "")
		: authHeader?.replace(/^Bearer\s+/i, "");

	if (!token) {
		if (behavior.jwt?.required === false) return true;
		return unauthorized(ctx);
	}

	try {
		const payload = await behavior.jwt?.service.verify(token);
		ctx.auth = {
			user: { ...(payload ?? {}) },
			token,
			payload: payload ?? {},
		};
		return true;
	} catch (error) {
		ctx.logger?.warn?.("auth:jwt_invalid", {
			error: error instanceof Error ? error.message : String(error),
			...getRequestMeta(ctx.req),
		});
		return unauthorized(ctx);
	}
}

async function applyGuards(ctx: Context, guards: GuardRule[]) {
	for (const guard of guards) {
		try {
			const result = await guard(ctx);
			if (result === false) {
				json(
					ctx.res,
					{ message: "Forbidden", code: "FORBIDDEN" },
					Status.FORBIDDEN,
				);
				return false;
			}
		} catch (error) {
			const status =
				typeof error === "object" && error && "status" in error
					? Number(error.status)
					: Status.FORBIDDEN;
			json(
				ctx.res,
				{
					message:
						status === Status.UNAUTHORIZED ? "Unauthorized" : "Forbidden",
				},
				status,
			);
			return false;
		}
	}

	return true;
}

async function applyProxy(ctx: Context, options: ProxyOptions) {
	const sourceUrl = new URL(ctx.req.url ?? "/", "http://localhost");
	const target = new URL(options.target);
	const rewrittenPath =
		options.rewrite?.(sourceUrl.pathname, ctx) ?? sourceUrl.pathname;
	target.pathname = joinPaths(target.pathname, rewrittenPath);
	target.search = sourceUrl.search;

	const headers = new Headers();
	for (const [key, value] of Object.entries(ctx.req.headers)) {
		if (value === undefined) continue;
		if (!options.preserveHost && key.toLowerCase() === "host") continue;
		headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
	}
	for (const [key, value] of Object.entries(
		resolveProxyHeaders(options, ctx),
	)) {
		headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
	}

	const controller = new AbortController();
	const timeout = options.timeout
		? setTimeout(() => controller.abort(), options.timeout)
		: undefined;

	try {
		const response = await fetch(target, {
			method: ctx.req.method,
			headers,
			body: ["GET", "HEAD"].includes(ctx.req.method ?? "")
				? undefined
				: serializeProxyBody(ctx.req.body),
			signal: controller.signal,
		});
		const responseHeaders: Record<string, string> = {};
		response.headers.forEach((value, key) => {
			responseHeaders[key] = value;
		});
		ctx.res.writeHead(response.status, responseHeaders);
		ctx.res.end(await response.text());
		ctx.logger?.info?.("proxy:success", {
			target: target.toString(),
			status: response.status,
			...getRequestMeta(ctx.req),
		});
	} catch (error) {
		ctx.logger?.error?.("proxy:error", {
			target: target.toString(),
			error: error instanceof Error ? error.message : String(error),
			...getRequestMeta(ctx.req),
		});
		json(
			ctx.res,
			{ message: "Proxy request failed", code: "PROXY_ERROR" },
			Status.BAD_GATEWAY,
		);
	} finally {
		if (timeout) clearTimeout(timeout);
	}
}

function unauthorized(ctx: Context) {
	json(
		ctx.res,
		{ message: "Unauthorized", code: "UNAUTHORIZED" },
		Status.UNAUTHORIZED,
	);
	return false;
}

function normalizePayloadIssues(issues: PayloadIssue[]): PayloadIssue[] {
	return issues.map((issue) => ({
		path: issue.path ?? [],
		message: issue.message,
		code: issue.code,
		expected: issue.expected,
		received: issue.received,
	}));
}

function getClientIp(req: Request) {
	const forwarded = req.headers["x-forwarded-for"];
	if (Array.isArray(forwarded)) return forwarded[0] ?? "unknown";
	if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
	return req.socket?.remoteAddress ?? "unknown";
}

function getRequestMeta(req: Request) {
	return {
		method: req.method,
		url: req.url,
	};
}

function resolveProxyHeaders(options: ProxyOptions, ctx: Context) {
	return typeof options.headers === "function"
		? options.headers(ctx)
		: (options.headers ?? {});
}

function serializeProxyBody(body: unknown) {
	if (body === undefined) return undefined;
	if (
		typeof body === "string" ||
		body instanceof Blob ||
		body instanceof ArrayBuffer
	) {
		return body;
	}
	return JSON.stringify(body);
}

function joinPaths(base: string, next: string) {
	const joined = `${base.replace(/\/$/, "")}/${next.replace(/^\//, "")}`;
	return joined === "/" ? joined : joined.replace(/\/$/, "");
}
