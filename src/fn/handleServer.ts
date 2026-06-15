import type { ServerResponse } from "node:http";
import { HTTP_STATUS } from "../constants/httpStatus.constants";
import { apiEventLog } from "../events/apiEventLog.event";
import type { BehaviorConfig } from "../types/behavior.t";
import type { Context, Request, Response } from "../types/network";
import type { RuntimeRoutes } from "../types/runtime.t";
import Parse from "../utils/body-parser";
import { runMiddlewares } from "../utils/runMiddleware";
import { runRoute } from "../utils/utils";
import { executeBehaviors } from "./behavior";
import { json } from "./response";

export default async function handleServer({
	req,
	res,
	routes,
	behaviors,
}: {
	req: Request;
	res: ServerResponse;
	routes: Array<RuntimeRoutes>;
	behaviors?: BehaviorConfig;
}) {
	req.__meta ??= {
		startTime: 0,
	};
	req.__meta.startTime = performance.now();

	const url = getUrl(req.url);
	const pathname = normalizePath(url.pathname);
	req.query = getQuery(url.searchParams);

	const matchingRoutes = routes
		.map((route) => ({
			route,
			params: matchPath(route.path, pathname),
		}))
		.filter((match) => match.params !== null);

	if (matchingRoutes.length === 0) {
		return sendFrameworkJson({
			req,
			res,
			status: HTTP_STATUS.NOT_FOUND,
			payload: { message: "Route Not Found" },
		});
	}

	const match = matchingRoutes.find(
		({ route }) => route.method.toLowerCase() === req.method?.toLowerCase(),
	);

	if (!match) {
		return sendFrameworkJson({
			req,
			res,
			status: HTTP_STATUS.METHOD_NOT_ALLOWED,
			payload: { message: "Method Not Allowed" },
		});
	}

	const { route, params } = match;
	req.params = params ?? {};

	if (["post", "patch", "put"].includes(req.method?.toLowerCase() ?? "")) {
		try {
			req.body = await Parse(req);
		} catch {
			return sendFrameworkJson({
				req,
				res,
				status: HTTP_STATUS.BAD_REQUEST,
				payload: { message: "Malformed JSON body" },
			});
		}
	}

	const ctx: Context = {
		req,
		res,
	};
	const behaviorResult = await executeBehaviors({
		ctx,
		global: behaviors,
		route: route.behavior,
	});

	if (!behaviorResult.shouldContinue) {
		if (res.writableEnded) {
			emitLog(req, res.statusCode);
		}
		return;
	}

	await runMiddlewares({
		middlewares: [...route.middlewares],
		req,
		res,
		onRunRoute: async (req, res) => {
			await runRoute({
				func: route.handler,
				req,
				res,
				ctx,
			});
		},
	});

	if (res.writableEnded) {
		emitLog(req, res.statusCode);
	}
}

function getUrl(url: string | undefined) {
	try {
		return new URL(url ?? "/", "http://localhost");
	} catch {
		return new URL("/", "http://localhost");
	}
}

function normalizePath(routePath: string) {
	if (routePath.length > 1 && routePath.endsWith("/")) {
		return routePath.slice(0, -1);
	}
	return routePath || "/";
}

function getQuery(
	searchParams: URLSearchParams,
): Record<string, string | string[]> {
	const query: Record<string, string | string[]> = {};

	for (const [key, value] of searchParams.entries()) {
		const current = query[key];
		if (current === undefined) {
			query[key] = value;
		} else if (Array.isArray(current)) {
			current.push(value);
		} else {
			query[key] = [current, value];
		}
	}

	return query;
}

function matchPath(routePath: string, pathname: string) {
	const routeSegments = normalizePath(routePath).split("/").filter(Boolean);
	const pathSegments = normalizePath(pathname).split("/").filter(Boolean);

	if (routeSegments.length !== pathSegments.length) {
		return null;
	}

	const params: Record<string, string> = {};

	for (let index = 0; index < routeSegments.length; index++) {
		const routeSegment = routeSegments[index];
		const pathSegment = pathSegments[index];

		if (!routeSegment || !pathSegment) return null;

		if (routeSegment.startsWith(":")) {
			params[routeSegment.slice(1)] = decodeURIComponent(pathSegment);
			continue;
		}

		if (routeSegment !== pathSegment) {
			return null;
		}
	}

	return params;
}

function emitLog(req: Request, status: number) {
	if (req.__meta.logged) return;
	req.__meta.logged = true;
	apiEventLog.emit(
		"api:log",
		req.__meta.startTime,
		req.url,
		req.method,
		status,
	);
}

function sendFrameworkJson({
	req,
	res,
	status,
	payload,
}: {
	req: Request;
	res: Response;
	status: number;
	payload: unknown;
}) {
	if (!res.writableEnded) {
		json(res, payload, status);
	}
	emitLog(req, status);
}
