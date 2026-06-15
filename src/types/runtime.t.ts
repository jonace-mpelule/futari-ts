import type { BehaviorConfig } from "./behavior.t";
import type {
	LegacyRouteHandlerFunction,
	Method,
	MiddlewareFunction,
	RouteHandlerFunction,
} from "./network";

export type RuntimeRoutes = {
	method: Method;
	path: string;
	handler: RouteHandlerFunction | LegacyRouteHandlerFunction;
	middlewares: Array<MiddlewareFunction>;
	behavior?: BehaviorConfig;
};
