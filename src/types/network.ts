import type { IncomingMessage, ServerResponse } from "node:http";
import type { AuthState, Bouncer, FutariLogger } from "./behavior.t";

export type Request<T = unknown> = IncomingMessage & {
	body?: T;
	params: Record<string, string>;
	query: Record<string, string | string[]>;
	__meta: {
		startTime: number;
		endTime?: number;
		logged?: boolean;
	};
};

export type Response = ServerResponse & {};

export type ResponseHeaders = Record<string, string | number | string[]>;

export type Next = (err?: unknown) => void | Promise<void>;

export type Context<B = unknown> = {
	req: Request<B>;
	res: Response;
	next?: Next;
	auth?: AuthState;
	bouncer?: Bouncer;
	logger?: FutariLogger;
};

export type RouteHandlerFunction<B = unknown> = (
	ctx: Context<B>,
) => unknown | Promise<unknown>;

export type LegacyRouteHandlerFunction<B = unknown> = (
	req: Request<B>,
	res: Response,
) => unknown | Promise<unknown>;

export type MiddlewareContext<B = unknown> = {
	req: Request<B>;
	res: Response;
	next: Next;
};

export type Router = {
	id: string;
	isRouter: boolean;
};

export type Route = {
	baseRoute: string;
	subRoutes: Array<SubRoute>;
	filePath: string;
};

export type Method =
	| "GET"
	| "POST"
	| "PUT"
	| "PATCH"
	| "DELETE"
	| "HEAD"
	| "OPTIONS"
	| "CONNECT"
	| "TRACE";

export type MiddlewareFunction = (
	ctx: MiddlewareContext,
) => unknown | Promise<unknown>;

export type SubRoute = {
	id: string;
	method: Method;
	path: string;
	handlerKey: string;
	middlewares: Array<MiddlewareType>;
};

export type MiddlewareType = {
	id: string;
	handlerKey: string;
	handler: MiddlewareFunction;
};

export type RouteController = (new (
	...args: never[]
) => unknown) & {
	__futari_router?: Router;
	__futari_routes?: Array<SubRoute>;
	__futari_middlewares?: Array<MiddlewareType>;
	__futari_behaviors?: Array<import("./behavior.t").BehaviorMetadata>;
};
