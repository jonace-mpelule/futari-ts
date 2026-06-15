/** biome-ignore-all lint/suspicious/noExplicitAny: <'explanation'> */
import { readdir } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import signale from "signale";
import { DEF_ROUTE_KEY } from "../constants/symbols.constants";
import type {
	Context,
	LegacyRouteHandlerFunction,
	Request,
	Response,
	RouteController,
	RouteHandlerFunction,
	Router,
} from "../types/network";

export const checkRoutes = async (filePath: string) => {
	let module: any;
	if (filePath.endsWith("/+route.ts")) {
		module = await import(filePath);
	} else {
		signale.log(
			chalk.red("Error:"),
			`${filePath.split("/routes")[1]} has no default class or +route.ts file is not defined`,
		);
		process.exit(1);
	}

	if (typeof module.default !== "function") {
		signale.log(
			chalk.red("Error:"),
			`${filePath.split("/routes")[1]} has no default class or +route.ts file is not defined`,
		);
		process.exit(1);
	}

	const controller = module.default as RouteController;
	const router: Router | undefined =
		controller.__futari_router ??
		Reflect.getMetadata(DEF_ROUTE_KEY, module.default) ??
		undefined;

	if (!router || !router.isRouter) {
		signale.log(
			chalk.bgRed("Error:"),
			`${filePath.split("/routes/")[1]} is not a valid router please attach '@DefRoute()' to the default class `,
		);
		process.exit(1);
	}
};

export const processRoutes = async (filePath: string) => {
	try {
		const module = await import(filePath);
		const controller = module.default as RouteController;
		const routes = controller.__futari_routes ?? [];
		const middlewares = controller.__futari_middlewares ?? [];

		return routes.map((route) => ({
			...route,
			middlewares: middlewares.filter(
				(middleware) =>
					middleware.id === route.id &&
					middleware.handlerKey === route.handlerKey,
			),
		}));
	} catch (err) {
		console.log("process routes", err);
	}
};

export const runRoute = async ({
	func,
	req,
	res,
	ctx,
}: {
	func: RouteHandlerFunction | LegacyRouteHandlerFunction;
	req: Request;
	res: Response;
	ctx?: Context;
}) => {
	const routeContext: Context = ctx ?? {
		req,
		res,
	};

	if (func.length >= 2) {
		return (func as LegacyRouteHandlerFunction)(req, res);
	}

	return (func as RouteHandlerFunction)(routeContext);
};

export const runDefault = async (filePath: string) => {
	const module = await import(filePath);
	if (typeof module.default !== "function") {
		throw new Error("Default export is not a function");
	}
	return module.default();
};

export async function getDirectoryPathsRecursive(dirPath: string) {
	let directories: Array<string> = [];

	try {
		const entries = await readdir(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dirPath, entry.name);

			if (entry.isDirectory()) {
				directories.push(fullPath);
				directories = directories.concat(
					await getDirectoryPathsRecursive(fullPath),
				);
			}
		}
	} catch {}

	return directories;
}

/**
 * @description Resolves if port is alreadt in use or not
 * @param port
 * @returns {isInUse: boolean, err?: string | null}
 */
export async function isPortAvailable(
	port: number,
): Promise<{ isInUse: boolean; err?: string | null }> {
	const portUsed = await import("tcp-port-used");

	return new Promise((resolve, reject) => {
		portUsed.check(port, "127.0.0.1").then(
			(inUse: boolean) => {
				resolve({ isInUse: inUse });
			},
			(err: Error) => {
				reject(err.message);
			},
		);
	});
}

export async function silenceLogs<T>(fn: () => Promise<T>): Promise<T> {
	const stdoutWrite = process.stdout.write;
	const stderrWrite = process.stderr.write;

	process.stdout.write = (() => true) as any;
	process.stderr.write = (() => true) as any;

	try {
		return await fn();
	} finally {
		process.stdout.write = stdoutWrite;
		process.stderr.write = stderrWrite;
	}
}
