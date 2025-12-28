import { readdir } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import signale from "signale";
import {
	DEF_ROUTE_KEY,
	MIDDLEWARE_KEY,
	ROUTES_KEY,
} from "../constants/symbols.constants";
import type {
	Middleware,
	Request,
	Response,
	Router,
	SubRoute,
} from "../types/network";

export const checkRoutes = async (filePath: string) => {
	const module = await import(filePath);

	if (typeof module.default !== "function") {
		signale.log(
			chalk.red("Error:"),
			`${filePath.split("/routes")[1]} has no default class or +route.ts file is not defined`,
		);
		process.exit(1);
	}

	/**
	 * * Gets constructor/class assigned metadata
	 */
	const router: Router | undefined =
		Reflect.getMetadata(DEF_ROUTE_KEY, module.default) ?? undefined;

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

		const routes =
			(Reflect.getMetadata(ROUTES_KEY, module.default) as Array<SubRoute>) ||
			[];
		const middlewares =
			(Reflect.getMetadata(
				MIDDLEWARE_KEY,
				module.default,
			) as Array<Middleware>) || [];

		// const routes: Array<SubRoute> = data.__routes;
		for (const mid of middlewares ?? []) {
			const index = routes.findIndex(
				(e) => e.id === mid.id && e.handlerKey === mid.handlerKey,
			);
			if (index !== -1) {
				routes[index]?.middlewares.push(mid);
			}
		}

		return routes;
	} catch (err) {
		console.log("proccess routes", err);
	}
};

export const runRoute = async ({
	filePath,
	handlerKey,
	req,
	res,
}: {
	filePath: string;
	handlerKey: string;
	req: Request;
	res: Response;
}) => {
	const module = await import(filePath);
	if (typeof module.default !== "function") {
		throw new Error("Default export is not a function");
	}

	return new module.default()[handlerKey](req, res);
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
			const fullPath: any = path.join(dirPath, entry.name);

			if (entry.isDirectory()) {
				// Add the current directory path to the list
				directories.push(fullPath);

				// Recurse into this subdirectory and merge the results
				directories = directories.concat(
					await getDirectoryPathsRecursive(fullPath),
				);
			}
			// Files are ignored in this version
		}
	} catch (error: any) {
		// console.error(`Error reading directory ${dirPath}:`, error.message);
		// Depending on your needs, you might want to throw the error
	}

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
			(inUse) => {
				resolve({ isInUse: inUse });
			},
			(err) => {
				reject(err.message);
			},
		);
	});
}
