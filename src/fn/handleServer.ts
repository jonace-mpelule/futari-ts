/** biome-ignore-all lint/suspicious/noExplicitAny: <'explanation'> */
import type { ServerResponse } from "node:http";
import type { Context } from "../../build/index.d.mts";
import { HTTP_STATUS } from "../constants/httpStatus.constants";
import { apiEventLog } from "../events/apiEventLog.event";
import type { Request } from "../types/network";
import type { RuntimeRoutes } from "../types/runtime.t";
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
	routes: Array<RuntimeRoutes>;
}) {
	/**
	 * * Getting The Request Start Time
	 */
	(req as any).__meta ??= {};
	const requestStartTime = performance.now();
	req.__meta.startTime = requestStartTime;
	/**
	 ** -----------------------------------
	 ** -----------------------------------
	 */

	const matchingRoutes = routes.filter((e) => req.url?.startsWith(e.path));

	if (!matchingRoutes.length) {
		return NotFound({ req, res });
	}

	for (const route of matchingRoutes) {
		if (route.method.toLocaleLowerCase() !== req.method?.toLocaleLowerCase()) {
			return NotFound({ req, res });
		}

		let body = {};
		if (["post", "patch", "put"].includes(req.method.toLocaleLowerCase())) {
			body = await Parse(req);
			req.body = body;
		}

		runMiddlewares({
			middlewares: route.middlewares.reverse(),
			req,
			res,
			onRunRoute: async (req, res) => {
				await runRoute({
					func: route.handler,
					req,
					res,
				});
			},
		});
	}
}

function NotFound({ req, res }: Context) {
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
