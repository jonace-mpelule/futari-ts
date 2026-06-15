import type { MiddlewareFunction } from "../types/network";

/**
 * Function middleware is the stable v1 middleware contract.
 * This alias keeps older imports compiling while class middleware remains out of scope.
 */
export type Middleware = MiddlewareFunction;
