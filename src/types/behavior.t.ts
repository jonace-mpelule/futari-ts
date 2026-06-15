import type { Context, ResponseHeaders } from "./network";

export type PayloadIssue = {
	path: Array<string | number>;
	message: string;
	code?: string;
	expected?: unknown;
	received?: unknown;
};

export type SafeParseResult<T = unknown> =
	| { success: true; data: T }
	| {
			success: false;
			error: { issues?: PayloadIssue[]; errors?: PayloadIssue[] };
	  };

export type PayloadSchema<T = unknown> = {
	safeParse: (input: unknown) => SafeParseResult<T>;
};

export type PayloadGuardOptions = {
	message?: string;
};

export type PayloadBehavior = {
	schema: PayloadSchema;
	options?: PayloadGuardOptions;
};

export type RateLimitResult = {
	allowed: boolean;
	limit: number;
	remaining: number;
	resetAt: number;
	retryAfter: number;
};

export type RateLimitStore = {
	hit: (
		key: string,
		limit: number,
		windowMs: number,
	) => RateLimitResult | Promise<RateLimitResult>;
};

export type RateLimitOptions = {
	limit: number;
	windowMs: number;
	key?: (ctx: Context) => string;
	store?: RateLimitStore;
};

export type FutariLogger = {
	debug?: (message: string, meta?: Record<string, unknown>) => void;
	info?: (message: string, meta?: Record<string, unknown>) => void;
	warn?: (message: string, meta?: Record<string, unknown>) => void;
	error?: (message: string, meta?: Record<string, unknown>) => void;
};

export type ProxyOptions = {
	target: string;
	rewrite?: (path: string, ctx: Context) => string;
	timeout?: number;
	headers?: ResponseHeaders | ((ctx: Context) => ResponseHeaders);
	preserveHost?: boolean;
};

export type AuthUser = {
	id?: string;
	[key: string]: unknown;
};

export type AuthState<TUser extends AuthUser = AuthUser> = {
	user: TUser;
	token: string;
	payload: Record<string, unknown>;
};

export type JwtOptions = {
	secret: string;
	issuer?: string;
	audience?: string;
	expiresIn?: number;
};

export type Ability<TArgs extends unknown[] = unknown[]> = (
	ctx: Context,
	...args: TArgs
) => boolean | Promise<boolean>;

export type Policy = Record<string, Ability>;

export type Bouncer = {
	define: <TArgs extends unknown[]>(
		name: string,
		ability: Ability<TArgs>,
	) => Bouncer;
	allows: (ctx: Context, name: string, ...args: unknown[]) => Promise<boolean>;
	denies: (ctx: Context, name: string, ...args: unknown[]) => Promise<boolean>;
	authorize: (ctx: Context, name: string, ...args: unknown[]) => Promise<void>;
	policy: (name: string, policy: Policy) => Bouncer;
};

export type GuardRule = (
	ctx: Context,
) => boolean | undefined | Promise<boolean | undefined>;

export type JwtBehavior = {
	service: {
		sign: (payload: Record<string, unknown>) => Promise<string>;
		verify: (token: string) => Promise<Record<string, unknown>>;
	};
	required?: boolean;
};

export type BehaviorConfig = {
	payload?: PayloadBehavior;
	rateLimit?: RateLimitOptions | false;
	guards?: GuardRule[];
	proxy?: ProxyOptions;
	logger?: FutariLogger;
	jwt?: JwtBehavior;
	bouncer?: Bouncer;
};

export type ResolvedBehaviorConfig = BehaviorConfig;

export type BehaviorType =
	| "payload"
	| "rateLimit"
	| "guard"
	| "proxy"
	| "behavior";

export type BehaviorMetadata = {
	id: string;
	handlerKey: string;
	type: BehaviorType;
	config: BehaviorConfig;
};
