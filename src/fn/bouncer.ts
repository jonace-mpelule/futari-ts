import { Status } from "../constants/httpStatus.constants";
import type { Ability, Bouncer, Policy } from "../types/behavior.t";

export class AuthorizationError extends Error {
	status = Status.FORBIDDEN;

	constructor(message = "Forbidden") {
		super(message);
		this.name = "AuthorizationError";
	}
}

export function createBouncer(): Bouncer {
	const abilities = new Map<string, Ability>();
	const policies = new Map<string, Policy>();

	const bouncer: Bouncer = {
		define(name, ability) {
			abilities.set(name, ability as Ability);
			return bouncer;
		},
		async allows(ctx, name, ...args) {
			const ability =
				abilities.get(name) ?? resolvePolicyAbility(policies, name);
			if (!ability) return false;
			return Boolean(await ability(ctx, ...args));
		},
		async denies(ctx, name, ...args) {
			return !(await bouncer.allows(ctx, name, ...args));
		},
		async authorize(ctx, name, ...args) {
			if (await bouncer.denies(ctx, name, ...args)) {
				throw new AuthorizationError();
			}
		},
		policy(name, policy) {
			policies.set(name, policy);
			return bouncer;
		},
	};

	return bouncer;
}

function resolvePolicyAbility(policies: Map<string, Policy>, name: string) {
	const [policyName, methodName] = name.split(".");
	if (!policyName || !methodName) return undefined;
	return policies.get(policyName)?.[methodName];
}
