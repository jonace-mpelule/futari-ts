import type { MiddlewareContext, Next, Request, Response } from "../types/network";


export function Middleware (
    handler: (ctx: MiddlewareContext) => Promise<void> | void
) {
    return async (req: Request, res: Response, next: Next) => {
        const result = await handler({
            req: req,
            res: res,
            next
        });
    }
}