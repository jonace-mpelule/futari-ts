import { IncomingMessage, ServerResponse } from "node:http";

//#region src/types/network.d.ts
type Request<T = {}> = IncomingMessage & {
  body: T;
  __meta: {
    startTime: number;
    endTime: number;
  };
};
type Response = ServerResponse & {};
type Next = () => void;
type Context<B = {}> = {
  req: Request<B>;
  res: Response;
  next?: Next;
};
//#endregion
//#region src/decorators/route.decorators.d.ts
declare function DefRoute(): (target: any) => void;
declare function Use(fn: (ctx: Context) => void): (target: any, key: string, descriptor?: PropertyDescriptor) => void;
declare function Get(path: string): (target: any, key: string, descriptor?: PropertyDescriptor) => void;
declare function Post(path: string): (target: any, key: string, descriptor?: PropertyDescriptor) => void;
declare function Put(path: string): (target: any, key: string, descriptor?: PropertyDescriptor) => void;
declare function Patch(path: string): (target: any, key: string, descriptor?: PropertyDescriptor) => void;
declare function Delete(path: string): (target: any, key: string, descriptor?: PropertyDescriptor) => void;
declare function Head(path: string): (target: any, key: string, descriptor?: PropertyDescriptor) => void;
declare function Options(path: string): (target: any, key: string, descriptor?: PropertyDescriptor) => void;
declare function Connect(path: string): (target: any, key: string, descriptor?: PropertyDescriptor) => void;
declare function Trace(path: string): (target: any, key: string, descriptor?: PropertyDescriptor) => void;
//#endregion
//#region src/types/config.t.d.ts
type Config = {
  cors: boolean;
  /**
   * @description - Root path of your project file
   * @example - root: proccess.cwd()
   */
  root: string;
  port: number;
  compressionEnabled?: boolean;
};
//#endregion
//#region src/fn/createServer.d.ts
declare function Server(): {
  config: (config: Config) => void;
  serve: (callback?: () => void) => Promise<void>;
};
//#endregion
//#region src/fn/routeWrapper.d.ts
/**
 * Generic controller wrapper.
 * Allows per-handler status codes and custom error handling.
 */
declare function RouteHandler<T = unknown, R = unknown>(handler: <T>(ctx: Context<T>) => Promise<R> | R, options?: {
  successStatus?: number;
  transform?: (data: R) => unknown;
  onError?: (error: unknown, req: Request, res: Response) => unknown;
}): (req: Request<T>, res: Response) => Promise<void>;
//#endregion
export { type Config, Connect, type Context, DefRoute, Delete, Get, Head, Options, Patch, Post, Put, type Request, type Response, RouteHandler, Server, Trace, Use };
//# sourceMappingURL=index.d.mts.map