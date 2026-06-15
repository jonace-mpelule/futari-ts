import type { RateLimitResult, RateLimitStore } from "../types/behavior.t";

type Bucket = {
	count: number;
	resetAt: number;
};

export class MemoryRateLimitStore implements RateLimitStore {
	private buckets = new Map<string, Bucket>();

	hit(key: string, limit: number, windowMs: number): RateLimitResult {
		const now = Date.now();
		const current = this.buckets.get(key);
		const bucket =
			current && current.resetAt > now
				? current
				: {
						count: 0,
						resetAt: now + windowMs,
					};

		bucket.count += 1;
		this.buckets.set(key, bucket);

		const remaining = Math.max(limit - bucket.count, 0);
		const retryAfter = Math.max(Math.ceil((bucket.resetAt - now) / 1000), 0);

		return {
			allowed: bucket.count <= limit,
			limit,
			remaining,
			resetAt: bucket.resetAt,
			retryAfter,
		};
	}
}

export const defaultRateLimitStore = new MemoryRateLimitStore();
