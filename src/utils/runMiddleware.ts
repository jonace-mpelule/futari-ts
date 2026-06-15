import { HTTP_STATUS } from "../constants/httpStatus.constants";
import { apiEventLog } from "../events/apiEventLog.event";
import type { MiddlewareFunction, Request, Response } from "../types/network";

function emitLog(req: Request, status: number) {
	if (req.__meta.logged) return;
	req.__meta.logged = true;
	apiEventLog.emit(
		"api:log",
		req.__meta.startTime,
		req.url,
		req.method,
		status,
	);
}

function sendJson(res: Response, status: number, payload: unknown) {
	if (res.writableEnded) return;
	res.writeHead(status, {
		"content-type": "application/json",
	});
	res.end(JSON.stringify(payload));
}

export async function runMiddlewares({
	middlewares,
	req,
	res,
	onRunRoute,
}: {
	middlewares: MiddlewareFunction[];
	req: Request;
	res: Response;
	onRunRoute: (req: Request, res: Response) => unknown | Promise<unknown>;
}) {
	let index = 0;
	let finished = false;

	async function next(err?: unknown): Promise<void> {
		if (finished) return;

		if (err) {
			finished = true;
			sendJson(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, {
				message: "Internal Server Error",
			});
			emitLog(req, HTTP_STATUS.INTERNAL_SERVER_ERROR);
			return;
		}

		if (res.writableEnded) {
			finished = true;
			emitLog(req, res.statusCode);
			return;
		}

		const middleware = middlewares[index++];

		if (!middleware) {
			finished = true;
			try {
				await onRunRoute(req, res);
			} catch {
				sendJson(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, {
					message: "Internal Server Error",
				});
				emitLog(req, HTTP_STATUS.INTERNAL_SERVER_ERROR);
			}
			return;
		}

		try {
			await middleware({
				req,
				res,
				next,
			});

			if (res.writableEnded) {
				finished = true;
				emitLog(req, res.statusCode);
			}
		} catch (error) {
			await next(error);
		}
	}

	await next();
}
