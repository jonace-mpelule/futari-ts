import type { StatusCode } from "../constants/httpStatus.constants";
import type { Response, ResponseHeaders } from "../types/network";

function write(
	res: Response,
	status: number,
	headers: ResponseHeaders,
	body?: string,
) {
	if (res.writableEnded) return;
	res.writeHead(status, headers);
	res.end(body);
}

export function json(
	res: Response,
	data: unknown,
	status: StatusCode = 200,
	headers: ResponseHeaders = {},
) {
	write(
		res,
		status,
		{
			"content-type": "application/json",
			...headers,
		},
		JSON.stringify(data),
	);
}

export function text(
	res: Response,
	body: string,
	status: StatusCode = 200,
	headers: ResponseHeaders = {},
) {
	write(
		res,
		status,
		{
			"content-type": "text/plain; charset=utf-8",
			...headers,
		},
		body,
	);
}

export function redirect(
	res: Response,
	location: string,
	status: StatusCode = 302,
) {
	write(res, status, {
		location,
	});
}

export function empty(
	res: Response,
	status: StatusCode = 204,
	headers: ResponseHeaders = {},
) {
	write(res, status, headers);
}
