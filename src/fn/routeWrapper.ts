// utils/controller-handler.ts
import { HTTP_STATUS } from "../constants/httpStatus.constants.ts";
import { apiEventLog } from "../events/apiEventLog.event.ts";
import type { Context, Request, Response } from "../types/network.ts";
import { json } from "./response.ts";

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

/**
 * Generic controller wrapper.
 * Allows per-handler status codes and custom error handling.
 */
export function RouteHandler<T = unknown, R = unknown>(
	handler: (ctx: Context<T>) => Promise<R> | R,
	options?: {
		successStatus?: number; // Custom success HTTP status
		transform?: (data: R) => unknown; // Optional response data transformer
		onError?: (error: unknown, req: Request<T>, res: Response) => unknown;
	},
) {
	return async (ctx: Context<T>) => {
		const { req, res } = ctx;
		try {
			const result = await handler(ctx);

			if (res.writableEnded) {
				emitLog(req, res.statusCode);
				return;
			}

			const transformed = options?.transform
				? options.transform(result)
				: result;
			const status = options?.successStatus ?? 200;
			json(res, transformed, status);
			emitLog(req, status);
		} catch (error: unknown) {
			if (options?.onError) {
				await options.onError(error, req, res);
				emitLog(req, res.statusCode);
				return;
			}

			if (!res.writableEnded) {
				json(
					res,
					{ message: "Internal Server Error" },
					HTTP_STATUS.INTERNAL_SERVER_ERROR,
				);
			}
			emitLog(req, HTTP_STATUS.INTERNAL_SERVER_ERROR);
		}
	};
}
