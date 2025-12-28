/** biome-ignore-all lint/suspicious/noExplicitAny: <'explanation'> */
import type { ServerResponse } from "node:http";
import { HTTP_STATUS } from "../constants/httpStatus.constants";
import { apiEventLog } from "../events/apiEventLog.event";
import type { Request, Route } from "../types/network";
import Parse from "../utils/body-parser";
import { runMiddlewares } from "../utils/runMiddleware";
import { runRoute } from "../utils/utils";

export default async function handleServer({
	req,
	res,
	routes,
}: {
	req: Request;
	res: ServerResponse;
	routes: Array<Route>;
}) {
	/**
	 * * Getting The Request Start Time
	 */
    (req as any).__meta ??= {}
	const requestStartTime = performance.now();
	req.__meta.startTime = requestStartTime;
	/**
	 ** -----------------------------------
	 ** -----------------------------------
	 */

	const matchingRoutes = routes.filter((e) => req.url?.startsWith(e.baseRoute));

	if (!matchingRoutes.length) {
		res.writeHead(HTTP_STATUS.NOT_FOUND, {
			"content-type": "application/json",
		});
		apiEventLog.emit(
			"api:log",
			req.__meta.startTime,
			req.url,
			req.method,
			HTTP_STATUS.NOT_FOUND,
		);
		return res.end(
			JSON.stringify({
				message: "Route Not Found",
			}),
		);
	}

	for (const route of matchingRoutes) {
		for (const subRoute of route.subRoutes) {
			if (
				req.url === `${route.baseRoute}${subRoute.path}` &&
				req.method?.toLocaleLowerCase() ===
					subRoute.method.toLocaleLowerCase().trim()
			) {
				let body = {};
				if (["post", "patch", "put"].includes(req.method.toLocaleLowerCase())) {
					body = await Parse(req);
					req.body = body;
				}

				runMiddlewares({
					middlewares: subRoute.middlewares.reverse(),
					req,
					res,
					onRunRoute: async (req, res) => {
						await runRoute({
							filePath: `${route.filePath}/+route.ts`,
							handlerKey: subRoute.handlerKey,
							req,
							res,
						});
					},
				});
			}
		}
	}
}
