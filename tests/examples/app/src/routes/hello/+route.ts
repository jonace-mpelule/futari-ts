import {
	type Context,
	DefRoute,
	empty,
	Get,
	json,
	type MiddlewareContext,
	Post,
	RouteHandler,
	redirect,
	Status,
	text,
	Use,
} from "../../../../../../src/index";

type RequestWithMiddlewareOrder = MiddlewareContext["req"] & {
	middlewareOrder?: string[];
};

function firstMiddleware({ req, next }: MiddlewareContext) {
	const request = req as RequestWithMiddlewareOrder;
	request.middlewareOrder = [...(request.middlewareOrder ?? []), "first"];
	return next();
}

@DefRoute()
export default class HelloRoute {
	@Get("/")
	@Use(firstMiddleware)
	index = RouteHandler(async ({ req }) => {
		const request = req as RequestWithMiddlewareOrder;
		return {
			message: "hello",
			middlewareOrder: request.middlewareOrder ?? [],
		};
	});

	@Post("/echo")
	echo = RouteHandler(async ({ req }) => {
		return {
			body: req.body,
		};
	});

	@Get("/boom")
	boom = RouteHandler(async () => {
		throw new Error("boom");
	});

	@Get("/json-helper")
	jsonHelper = async ({ res }: Context) => {
		json(res, { helper: "json" }, Status.CREATED);
	};

	@Get("/text-helper")
	textHelper = async ({ res }: Context) => {
		text(res, "plain text");
	};

	@Get("/redirect-helper")
	redirectHelper = async ({ res }: Context) => {
		redirect(res, "/hello");
	};

	@Get("/empty-helper")
	emptyHelper = async ({ res }: Context) => {
		empty(res);
	};
}
