// utils/controller-handler.ts
import { HTTP_STATUS } from "../constants/httpStatus.constants.ts";
import { apiEventLog } from "../events/apiEventLog.event.ts";
import type { Context, Request, Response } from "../types/network.ts";
// import { mapErrorToResponse } from "./error.mapper.ts";

/**
 * Generic controller wrapper.
 * Allows per-handler status codes and custom error handling.
 */
export function RouteHandler<T = unknown, R = unknown>(
	handler: <T>(ctx: Context<T>) => Promise<R> | R,
	options?: {
		successStatus?: number; // Custom success HTTP status
		transform?: (data: R) => unknown; // Optional response data transformer
		onError?: (error: unknown, req: Request, res: Response) => unknown; // Custom error handler
	},
) {
	return async (req: Request<T>, res: Response) => {
		try {
			const result = await handler<T>({
				req: req,
				res: res,
			});

			// Type-safe transformation: allow transform to handle both T and R
			const transformed = options?.transform
				? options.transform(result)
				: result;

			// Custom success status (defaults to 200)
			const status = options?.successStatus ?? 200;
			res.writeHead(status);
			res.end(JSON.stringify(transformed));
			apiEventLog.emit(
				"api:log",
				req.__meta.startTime,
				req.url,
				req.method,
				status,
			);
            return
		} catch (_: unknown) {
			res.writeHead(HTTP_STATUS.INTERNAL_SERVER_ERROR);
			res.end(JSON.stringify({message: 'Internal Server Error'}));
			apiEventLog.emit(
				"api:log",
				req.__meta.startTime,
				req.url,
				req.method,
				HTTP_STATUS.INTERNAL_SERVER_ERROR,
			);
			return
		}
	};
}
