import type { Context } from "../types/network";

export type MiddlewareKind = "function";

export interface MiddlewareDef {
	kind: MiddlewareKind;
	name: string;
	target: unknown;
}

export function HandleMiddleware(fn: (ctx: Context) => unknown): MiddlewareDef {
	return {
		kind: "function",
		name: fn.name || "anonymous",
		target: fn,
	};
}
