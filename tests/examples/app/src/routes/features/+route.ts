import {
	Behavior,
	createBouncer,
	DefRoute,
	Proxy as FutariProxy,
	Get,
	Guard,
	jwt,
	Payload,
	Post,
	RateLimit,
	RouteHandler,
} from "../../../../../../src/index";

const payloadSchema = {
	safeParse(input: unknown) {
		if (
			typeof input === "object" &&
			input !== null &&
			"name" in input &&
			typeof input.name === "string"
		) {
			return {
				success: true as const,
				data: {
					name: input.name.trim(),
				},
			};
		}

		return {
			success: false as const,
			error: {
				issues: [
					{
						path: ["name"],
						message: "Expected string",
						code: "invalid_type",
						expected: "string",
						received: typeof input,
					},
				],
			},
		};
	},
};

const authJwt = jwt({ secret: "test-secret", issuer: "futari-test" });
const bouncer = createBouncer().define("features.view", async (ctx) => {
	return ctx.auth?.payload.sub === "user-1";
});

@DefRoute()
export default class FeatureRoute {
	@Post("/payload")
	@Payload(payloadSchema)
	payload = RouteHandler(async ({ req }) => {
		return {
			body: req.body,
		};
	});

	@Get("/limited")
	@RateLimit({
		limit: 1,
		windowMs: 60_000,
		key: () => "feature-limit",
	})
	limited = RouteHandler(async () => {
		return {
			ok: true,
		};
	});

	@Post("/proxy")
	@FutariProxy({
		target: "https://upstream.test/api",
		rewrite: () => "/forwarded",
		timeout: 1_000,
		headers: {
			"x-futari-proxy": "yes",
		},
	})
	proxy = RouteHandler(async () => {
		return {
			unreachable: true,
		};
	});

	@Get("/secure")
	@Behavior({
		jwt: authJwt.guard(),
		bouncer,
	})
	@Guard(async (ctx) => {
		await ctx.bouncer?.authorize(ctx, "features.view");
		return true;
	})
	secure = RouteHandler(async ({ auth }) => {
		return {
			sub: auth?.payload.sub,
		};
	});
}
