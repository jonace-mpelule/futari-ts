import { DefRoute, Get, RouteHandler } from "../../../../../../../src/index";

@DefRoute()
export default class UserRoute {
	@Get("/")
	show = RouteHandler(async ({ req }) => {
		return {
			params: req.params,
			query: req.query,
		};
	});
}
