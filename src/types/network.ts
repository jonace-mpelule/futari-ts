/** biome-ignore-all lint/complexity/noBannedTypes: <'explanation'> */
import type { IncomingMessage, ServerResponse } from "node:http";

export type Request<T = {}> = IncomingMessage & {
	body: T;
	__meta: {
		startTime: number, 
		endTime: number
	}
};

export type Response = ServerResponse & {
	
}

export type Next = () => void

export type Context<B ={}> = {
	req: Request<B>, 
	res: Response, 
	next?: Next
}

export type Router = {
	id: string, 
	isRouter: boolean
}

export type Route = {
	baseRoute: string,
	subRoutes: Array<SubRoute>,
	filePath: string
}

export type SubRoute = {
	id: string, 
	method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | "CONNECT" | "TRACE"
	path: string,
	handlerKey: string,
	middlewares: Array<Middleware>
} 

export type Middleware = {
	id: string, 
	handlerKey: string
	handler: (ctx: Context) => void
}