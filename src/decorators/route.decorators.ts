/** biome-ignore-all lint/suspicious/noExplicitAny: decorators operate on framework userland classes */
import "reflect-metadata";
import { v4 as uuidV4, v5 as uuidv5 } from "uuid";
import {
	DEF_ROUTE_KEY,
	MIDDLEWARE_KEY,
	ROUTES_KEY,
} from "../constants/symbols.constants";
import type {
	BehaviorConfig,
	BehaviorMetadata,
	GuardRule,
	PayloadGuardOptions,
	PayloadSchema,
	ProxyOptions,
	RateLimitOptions,
} from "../types/behavior.t";
import type {
	Method,
	MiddlewareFunction,
	MiddlewareType,
	RouteController,
	SubRoute,
} from "../types/network";

export const ROUTE_NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

export function DefRoute() {
	return (target: RouteController) => {
		const router = {
			id: uuidV4(),
			isRouter: true,
		};

		target.__futari_router = router;
		Reflect.defineMetadata(DEF_ROUTE_KEY, router, target);
	};
}

export function Use(fn: MiddlewareFunction) {
	return (target: any, key: string) => {
		const controller = target.constructor as RouteController;
		const defRouteData =
			controller.__futari_router ??
			Reflect.getMetadata(DEF_ROUTE_KEY, controller);
		const middlewares =
			controller.__futari_middlewares ??
			((Reflect.getMetadata(
				MIDDLEWARE_KEY,
				controller,
			) as Array<MiddlewareType>) ||
				[]);
		const handlerId = uuidv5(`${defRouteData?.id}:${key}`, ROUTE_NAMESPACE);

		middlewares.push({
			id: handlerId,
			handlerKey: key,
			handler: fn,
		});

		controller.__futari_middlewares = middlewares;
		Reflect.defineMetadata(MIDDLEWARE_KEY, middlewares, controller);
	};
}

export function Behavior(config: BehaviorConfig) {
	return (target: any, key: string) => {
		RegisterBehaviorMeta({
			key,
			target,
			type: "behavior",
			config,
		});
	};
}

export function Payload(schema: PayloadSchema, options?: PayloadGuardOptions) {
	return (target: any, key: string) => {
		RegisterBehaviorMeta({
			key,
			target,
			type: "payload",
			config: {
				payload: {
					schema,
					options,
				},
			},
		});
	};
}

export function RateLimit(options: RateLimitOptions) {
	return (target: any, key: string) => {
		RegisterBehaviorMeta({
			key,
			target,
			type: "rateLimit",
			config: {
				rateLimit: options,
			},
		});
	};
}

export function Guard(rule: GuardRule) {
	return (target: any, key: string) => {
		RegisterBehaviorMeta({
			key,
			target,
			type: "guard",
			config: {
				guards: [rule],
			},
		});
	};
}

// biome-ignore lint/suspicious/noShadowRestrictedNames: Public decorator API is intentionally named Proxy.
export function Proxy(options: ProxyOptions) {
	return (target: any, key: string) => {
		RegisterBehaviorMeta({
			key,
			target,
			type: "proxy",
			config: {
				proxy: options,
			},
		});
	};
}

export function Get(path: string) {
	return (target: any, key: string) => {
		RegisterRouteMeta({
			key,
			target,
			path,
			method: "GET",
		});
	};
}

export function Post(path: string) {
	return (target: any, key: string) => {
		RegisterRouteMeta({
			key,
			target,
			path,
			method: "POST",
		});
	};
}

export function Put(path: string) {
	return (target: any, key: string) => {
		RegisterRouteMeta({
			key,
			target,
			path,
			method: "PUT",
		});
	};
}

export function Patch(path: string) {
	return (target: any, key: string) => {
		RegisterRouteMeta({
			key,
			target,
			path,
			method: "PATCH",
		});
	};
}

export function Delete(path: string) {
	return (target: any, key: string) => {
		RegisterRouteMeta({
			key,
			target,
			path,
			method: "DELETE",
		});
	};
}

export function Head(path: string) {
	return (target: any, key: string) => {
		RegisterRouteMeta({
			key,
			target,
			path,
			method: "HEAD",
		});
	};
}

export function Options(path: string) {
	return (target: any, key: string) => {
		RegisterRouteMeta({
			key,
			target,
			path,
			method: "OPTIONS",
		});
	};
}

export function Connect(path: string) {
	return (target: any, key: string) => {
		RegisterRouteMeta({
			key,
			target,
			path,
			method: "CONNECT",
		});
	};
}

export function Trace(path: string) {
	return (target: any, key: string) => {
		RegisterRouteMeta({
			key,
			target,
			path,
			method: "TRACE",
		});
	};
}

function RegisterRouteMeta({
	key,
	target,
	path,
	method,
}: {
	key: string;
	target: any;
	path: string;
	method: Method;
}) {
	const controller = target.constructor as RouteController;
	const defRouteData =
		controller.__futari_router ??
		Reflect.getMetadata(DEF_ROUTE_KEY, controller);
	const routes =
		controller.__futari_routes ??
		((Reflect.getMetadata(ROUTES_KEY, controller) as Array<SubRoute>) || []);
	const handlerId = uuidv5(`${defRouteData?.id}:${key}`, ROUTE_NAMESPACE);

	routes.push({
		id: handlerId,
		method,
		path,
		handlerKey: key,
		middlewares: [],
	});

	controller.__futari_routes = routes;
	Reflect.defineMetadata(ROUTES_KEY, routes, controller);
}

function RegisterBehaviorMeta({
	key,
	target,
	type,
	config,
}: {
	key: string;
	target: any;
	type: BehaviorMetadata["type"];
	config: BehaviorConfig;
}) {
	const controller = target.constructor as RouteController;
	const defRouteData =
		controller.__futari_router ??
		Reflect.getMetadata(DEF_ROUTE_KEY, controller);
	const behaviors = controller.__futari_behaviors ?? [];
	const handlerId = uuidv5(`${defRouteData?.id}:${key}`, ROUTE_NAMESPACE);

	behaviors.push({
		id: handlerId,
		handlerKey: key,
		type,
		config,
	});

	controller.__futari_behaviors = behaviors;
}
