
import { HTTP_STATUS } from "../constants/httpStatus.constants";
import { apiEventLog } from "../events/apiEventLog.event";
import type { Middleware, Request, Response } from "../types/network";
export function runMiddlewares(
  {
    middlewares,
    req, 
    res,
    onRunRoute
  }: {
    middlewares: Middleware[],
    req: Request,
    res: Response,
    onRunRoute: (req: Request, res: Response) => any}
  ) {
    let index = 0;
    let finished = false;
  
    function next(err?: unknown) {
      // Prevent double execution
      if (finished) return;
  
      // Error handling
      if (err) {
        console.log(err)
        finished = true;
        res.end(JSON.stringify({message: 'error'}))
        // TODO: error handler
        // handleError(err, req, res);
        res.writeHead(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        res.end(JSON.stringify({message: 'Internal Server Error'}));
        apiEventLog.emit(
          "api:log",
          req.__meta.startTime,
          req.url,
          req.method,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
        );
        return;
      }
  
      // Stop if response already ended
      if (res.writableEnded) {
        apiEventLog.emit(
          "api:log",
          req.__meta.startTime,
          req.url,
          req.method,
          res.statusCode,
        );
        finished = true;
        return;
      }
  
      const middleware = middlewares[index++];
      
      if (!middleware) {
        finished = true;
        try {
          onRunRoute(req, res)
        } catch(_: unknown) {
          res.writeHead(HTTP_STATUS.INTERNAL_SERVER_ERROR);
          res.end(JSON.stringify({message: 'Internal Server Error'}));
          apiEventLog.emit(
            "api:log",
            req.__meta.startTime,
            req.url,
            req.method,
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
          );
        } 
        return;
      }



  
      try {

        const result: any = middleware.handler({
          req: req, 
          res: res, 
          next: next
        });
        
        // Handle async middleware
        if (result instanceof Promise) {
          result.catch(next);
        }
      } catch (error) {
        next(error);
      }
    }
  
    next();
  }