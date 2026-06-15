import "reflect-metadata";
import { IncomingMessage, ServerResponse } from "node:http";

//#region src/constants/httpStatus.constants.d.ts
/**
 * * List of Http Statuses
 */
declare const Status: {
  readonly CONTINUE: 100;
  readonly SWITCHING_PROTOCOLS: 101;
  readonly PROCESSING: 102;
  readonly EARLY_HINTS: 103;
  readonly OK: 200;
  readonly CREATED: 201;
  readonly ACCEPTED: 202;
  readonly NON_AUTHORITATIVE_INFORMATION: 203;
  readonly NO_CONTENT: 204;
  readonly RESET_CONTENT: 205;
  readonly PARTIAL_CONTENT: 206;
  readonly MULTI_STATUS: 207;
  readonly ALREADY_REPORTED: 208;
  readonly IM_USED: 226;
  readonly MULTIPLE_CHOICES: 300;
  readonly MOVED_PERMANENTLY: 301;
  readonly FOUND: 302;
  readonly SEE_OTHER: 303;
  readonly NOT_MODIFIED: 304;
  readonly USE_PROXY: 305;
  readonly TEMPORARY_REDIRECT: 307;
  readonly PERMANENT_REDIRECT: 308;
  readonly BAD_REQUEST: 400;
  readonly UNAUTHORIZED: 401;
  readonly PAYMENT_REQUIRED: 402;
  readonly FORBIDDEN: 403;
  readonly NOT_FOUND: 404;
  readonly METHOD_NOT_ALLOWED: 405;
  readonly NOT_ACCEPTABLE: 406;
  readonly PROXY_AUTHENTICATION_REQUIRED: 407;
  readonly REQUEST_TIMEOUT: 408;
  readonly CONFLICT: 409;
  readonly GONE: 410;
  readonly LENGTH_REQUIRED: 411;
  readonly PRECONDITION_FAILED: 412;
  readonly PAYLOAD_TOO_LARGE: 413;
  readonly URI_TOO_LONG: 414;
  readonly UNSUPPORTED_MEDIA_TYPE: 415;
  readonly RANGE_NOT_SATISFIABLE: 416;
  readonly EXPECTATION_FAILED: 417;
  readonly IM_A_TEAPOT: 418;
  readonly MISDIRECTED_REQUEST: 421;
  readonly UNPROCESSABLE_ENTITY: 422;
  readonly LOCKED: 423;
  readonly FAILED_DEPENDENCY: 424;
  readonly TOO_EARLY: 425;
  readonly UPGRADE_REQUIRED: 426;
  readonly PRECONDITION_REQUIRED: 428;
  readonly TOO_MANY_REQUESTS: 429;
  readonly REQUEST_HEADER_FIELDS_TOO_LARGE: 431;
  readonly UNAVAILABLE_FOR_LEGAL_REASONS: 451;
  readonly INTERNAL_SERVER_ERROR: 500;
  readonly NOT_IMPLEMENTED: 501;
  readonly BAD_GATEWAY: 502;
  readonly SERVICE_UNAVAILABLE: 503;
  readonly GATEWAY_TIMEOUT: 504;
  readonly HTTP_VERSION_NOT_SUPPORTED: 505;
  readonly VARIANT_ALSO_NEGOTIATES: 506;
  readonly INSUFFICIENT_STORAGE: 507;
  readonly LOOP_DETECTED: 508;
  readonly NOT_EXTENDED: 510;
  readonly NETWORK_AUTHENTICATION_REQUIRED: 511;
};
declare const HTTP_STATUS: {
  readonly CONTINUE: 100;
  readonly SWITCHING_PROTOCOLS: 101;
  readonly PROCESSING: 102;
  readonly EARLY_HINTS: 103;
  readonly OK: 200;
  readonly CREATED: 201;
  readonly ACCEPTED: 202;
  readonly NON_AUTHORITATIVE_INFORMATION: 203;
  readonly NO_CONTENT: 204;
  readonly RESET_CONTENT: 205;
  readonly PARTIAL_CONTENT: 206;
  readonly MULTI_STATUS: 207;
  readonly ALREADY_REPORTED: 208;
  readonly IM_USED: 226;
  readonly MULTIPLE_CHOICES: 300;
  readonly MOVED_PERMANENTLY: 301;
  readonly FOUND: 302;
  readonly SEE_OTHER: 303;
  readonly NOT_MODIFIED: 304;
  readonly USE_PROXY: 305;
  readonly TEMPORARY_REDIRECT: 307;
  readonly PERMANENT_REDIRECT: 308;
  readonly BAD_REQUEST: 400;
  readonly UNAUTHORIZED: 401;
  readonly PAYMENT_REQUIRED: 402;
  readonly FORBIDDEN: 403;
  readonly NOT_FOUND: 404;
  readonly METHOD_NOT_ALLOWED: 405;
  readonly NOT_ACCEPTABLE: 406;
  readonly PROXY_AUTHENTICATION_REQUIRED: 407;
  readonly REQUEST_TIMEOUT: 408;
  readonly CONFLICT: 409;
  readonly GONE: 410;
  readonly LENGTH_REQUIRED: 411;
  readonly PRECONDITION_FAILED: 412;
  readonly PAYLOAD_TOO_LARGE: 413;
  readonly URI_TOO_LONG: 414;
  readonly UNSUPPORTED_MEDIA_TYPE: 415;
  readonly RANGE_NOT_SATISFIABLE: 416;
  readonly EXPECTATION_FAILED: 417;
  readonly IM_A_TEAPOT: 418;
  readonly MISDIRECTED_REQUEST: 421;
  readonly UNPROCESSABLE_ENTITY: 422;
  readonly LOCKED: 423;
  readonly FAILED_DEPENDENCY: 424;
  readonly TOO_EARLY: 425;
  readonly UPGRADE_REQUIRED: 426;
  readonly PRECONDITION_REQUIRED: 428;
  readonly TOO_MANY_REQUESTS: 429;
  readonly REQUEST_HEADER_FIELDS_TOO_LARGE: 431;
  readonly UNAVAILABLE_FOR_LEGAL_REASONS: 451;
  readonly INTERNAL_SERVER_ERROR: 500;
  readonly NOT_IMPLEMENTED: 501;
  readonly BAD_GATEWAY: 502;
  readonly SERVICE_UNAVAILABLE: 503;
  readonly GATEWAY_TIMEOUT: 504;
  readonly HTTP_VERSION_NOT_SUPPORTED: 505;
  readonly VARIANT_ALSO_NEGOTIATES: 506;
  readonly INSUFFICIENT_STORAGE: 507;
  readonly LOOP_DETECTED: 508;
  readonly NOT_EXTENDED: 510;
  readonly NETWORK_AUTHENTICATION_REQUIRED: 511;
};
type StatusCode = (typeof Status)[keyof typeof Status] | number;
//#endregion
//#region src/types/network.d.ts
type Request<T = unknown> = IncomingMessage & {
  body?: T;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  __meta: {
    startTime: number;
    endTime?: number;
    logged?: boolean;
  };
};
type Response = ServerResponse & {};
type ResponseHeaders = Record<string, string | number | string[]>;
type Next = (err?: unknown) => void | Promise<void>;
type Context<B = unknown> = {
  req: Request<B>;
  res: Response;
  next?: Next;
  auth?: AuthState;
  bouncer?: Bouncer;
  logger?: FutariLogger;
};
type RouteHandlerFunction<B = unknown> = (ctx: Context<B>) => unknown | Promise<unknown>;
type MiddlewareContext<B = unknown> = {
  req: Request<B>;
  res: Response;
  next: Next;
};
type Router = {
  id: string;
  isRouter: boolean;
};
type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | "CONNECT" | "TRACE";
type MiddlewareFunction = (ctx: MiddlewareContext) => unknown | Promise<unknown>;
type SubRoute = {
  id: string;
  method: Method;
  path: string;
  handlerKey: string;
  middlewares: Array<MiddlewareType>;
};
type MiddlewareType = {
  id: string;
  handlerKey: string;
  handler: MiddlewareFunction;
};
type RouteController = (new (...args: never[]) => unknown) & {
  __futari_router?: Router;
  __futari_routes?: Array<SubRoute>;
  __futari_middlewares?: Array<MiddlewareType>;
  __futari_behaviors?: Array<BehaviorMetadata>;
};
//#endregion
//#region src/types/behavior.t.d.ts
type PayloadIssue = {
  path: Array<string | number>;
  message: string;
  code?: string;
  expected?: unknown;
  received?: unknown;
};
type SafeParseResult<T = unknown> = {
  success: true;
  data: T;
} | {
  success: false;
  error: {
    issues?: PayloadIssue[];
    errors?: PayloadIssue[];
  };
};
type PayloadSchema<T = unknown> = {
  safeParse: (input: unknown) => SafeParseResult<T>;
};
type PayloadGuardOptions = {
  message?: string;
};
type PayloadBehavior = {
  schema: PayloadSchema;
  options?: PayloadGuardOptions;
};
type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
};
type RateLimitStore = {
  hit: (key: string, limit: number, windowMs: number) => RateLimitResult | Promise<RateLimitResult>;
};
type RateLimitOptions = {
  limit: number;
  windowMs: number;
  key?: (ctx: Context) => string;
  store?: RateLimitStore;
};
type FutariLogger = {
  debug?: (message: string, meta?: Record<string, unknown>) => void;
  info?: (message: string, meta?: Record<string, unknown>) => void;
  warn?: (message: string, meta?: Record<string, unknown>) => void;
  error?: (message: string, meta?: Record<string, unknown>) => void;
};
type ProxyOptions = {
  target: string;
  rewrite?: (path: string, ctx: Context) => string;
  timeout?: number;
  headers?: ResponseHeaders | ((ctx: Context) => ResponseHeaders);
  preserveHost?: boolean;
};
type AuthUser = {
  id?: string;
  [key: string]: unknown;
};
type AuthState<TUser extends AuthUser = AuthUser> = {
  user: TUser;
  token: string;
  payload: Record<string, unknown>;
};
type JwtOptions = {
  secret: string;
  issuer?: string;
  audience?: string;
  expiresIn?: number;
};
type Ability<TArgs extends unknown[] = unknown[]> = (ctx: Context, ...args: TArgs) => boolean | Promise<boolean>;
type Policy = Record<string, Ability>;
type Bouncer = {
  define: <TArgs extends unknown[]>(name: string, ability: Ability<TArgs>) => Bouncer;
  allows: (ctx: Context, name: string, ...args: unknown[]) => Promise<boolean>;
  denies: (ctx: Context, name: string, ...args: unknown[]) => Promise<boolean>;
  authorize: (ctx: Context, name: string, ...args: unknown[]) => Promise<void>;
  policy: (name: string, policy: Policy) => Bouncer;
};
type GuardRule = (ctx: Context) => boolean | undefined | Promise<boolean | undefined>;
type JwtBehavior = {
  service: {
    sign: (payload: Record<string, unknown>) => Promise<string>;
    verify: (token: string) => Promise<Record<string, unknown>>;
  };
  required?: boolean;
};
type BehaviorConfig = {
  payload?: PayloadBehavior;
  rateLimit?: RateLimitOptions | false;
  guards?: GuardRule[];
  proxy?: ProxyOptions;
  logger?: FutariLogger;
  jwt?: JwtBehavior;
  bouncer?: Bouncer;
};
type ResolvedBehaviorConfig = BehaviorConfig;
type BehaviorType = "payload" | "rateLimit" | "guard" | "proxy" | "behavior";
type BehaviorMetadata = {
  id: string;
  handlerKey: string;
  type: BehaviorType;
  config: BehaviorConfig;
};
//#endregion
//#region src/decorators/route.decorators.d.ts
declare function DefRoute(): (target: RouteController) => void;
declare function Use(fn: MiddlewareFunction): (target: any, key: string) => void;
declare function Behavior(config: BehaviorConfig): (target: any, key: string) => void;
declare function Payload(schema: PayloadSchema, options?: PayloadGuardOptions): (target: any, key: string) => void;
declare function RateLimit(options: RateLimitOptions): (target: any, key: string) => void;
declare function Guard(rule: GuardRule): (target: any, key: string) => void;
declare function Proxy(options: ProxyOptions): (target: any, key: string) => void;
declare function Get(path: string): (target: any, key: string) => void;
declare function Post(path: string): (target: any, key: string) => void;
declare function Put(path: string): (target: any, key: string) => void;
declare function Patch(path: string): (target: any, key: string) => void;
declare function Delete(path: string): (target: any, key: string) => void;
declare function Head(path: string): (target: any, key: string) => void;
declare function Options(path: string): (target: any, key: string) => void;
declare function Connect(path: string): (target: any, key: string) => void;
declare function Trace(path: string): (target: any, key: string) => void;
//#endregion
//#region src/fn/bouncer.d.ts
declare class AuthorizationError extends Error {
  status: 403;
  constructor(message?: string);
}
declare function createBouncer(): Bouncer;
//#endregion
//#region src/types/config.t.d.ts
type Config = {
  cors: boolean;
  /**
   * @description - Root path of your project file
   * @example - root: proccess.cwd()
   */
  root: string;
  port: number;
  compressionEnabled?: boolean;
  behaviors?: BehaviorConfig;
};
//#endregion
//#region src/fn/createServer.d.ts
declare function Server(): {
  config: (config: Config) => void;
  serve: (callback?: () => void) => Promise<void>;
};
//#endregion
//#region src/fn/jwt.d.ts
declare function jwt(options: JwtOptions): {
  sign(payload: Record<string, unknown>): Promise<string>;
  verify(token: string): Promise<Record<string, unknown>>;
  guard(required?: boolean): {
    service: /*elided*/any;
    required: boolean;
  };
};
//#endregion
//#region src/fn/logger.d.ts
type ExternalLogger = Record<string, unknown>;
declare function winstonAdapter(logger: ExternalLogger): FutariLogger;
declare function bunyanAdapter(logger: ExternalLogger): FutariLogger;
//#endregion
//#region src/fn/rateLimit.d.ts
declare class MemoryRateLimitStore implements RateLimitStore {
  private buckets;
  hit(key: string, limit: number, windowMs: number): RateLimitResult;
}
declare const defaultRateLimitStore: MemoryRateLimitStore;
//#endregion
//#region src/fn/response.d.ts
declare function json(res: Response, data: unknown, status?: StatusCode, headers?: ResponseHeaders): void;
declare function text(res: Response, body: string, status?: StatusCode, headers?: ResponseHeaders): void;
declare function redirect(res: Response, location: string, status?: StatusCode): void;
declare function empty(res: Response, status?: StatusCode, headers?: ResponseHeaders): void;
//#endregion
//#region src/fn/routeWrapper.d.ts
/**
 * Generic controller wrapper.
 * Allows per-handler status codes and custom error handling.
 */
declare function RouteHandler<T = unknown, R = unknown>(handler: (ctx: Context<T>) => Promise<R> | R, options?: {
  successStatus?: number;
  transform?: (data: R) => unknown;
  onError?: (error: unknown, req: Request<T>, res: Response) => unknown;
}): (ctx: Context<T>) => Promise<void>;
//#endregion
//#region src/middleware/class.d.ts
/**
 * Function middleware is the stable v1 middleware contract.
 * This alias keeps older imports compiling while class middleware remains out of scope.
 */
type Middleware = MiddlewareFunction;
//#endregion
//#region src/middleware/middleware-wrapper.d.ts
type MiddlewareKind = "function";
interface MiddlewareDef {
  kind: MiddlewareKind;
  name: string;
  target: unknown;
}
declare function HandleMiddleware(fn: (ctx: Context) => unknown): MiddlewareDef;
//#endregion
export { type Ability, type AuthUser, AuthorizationError, Behavior, type BehaviorConfig, type Bouncer, type Config, Connect, type Context, DefRoute, Delete, type FutariLogger, Get, Guard, type GuardRule, HTTP_STATUS, HandleMiddleware, Head, type JwtOptions, MemoryRateLimitStore, type Middleware, type MiddlewareContext, type MiddlewareFunction, Options, Patch, Payload, type PayloadGuardOptions, type PayloadIssue, type Policy, Post, Proxy, type ProxyOptions, Put, RateLimit, type RateLimitOptions, type RateLimitStore, type Request, type ResolvedBehaviorConfig, type Response, type ResponseHeaders, RouteHandler, type RouteHandlerFunction, Server, Status, type StatusCode, Trace, Use, bunyanAdapter, createBouncer, defaultRateLimitStore, empty, json, jwt, redirect, text, winstonAdapter };
//# sourceMappingURL=index.d.mts.map