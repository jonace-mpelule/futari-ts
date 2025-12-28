/** biome-ignore-all lint/suspicious/useIterableCallbackReturn: <'explanation'> */
/** biome-ignore-all lint/style/noNonNullAssertion: <'explanation'> */

import { createServer } from "node:http";
import { Chalk } from "chalk";
import signale from "signale";
import type { Config } from "../types/config.t";
import type { Route } from "../types/network";
import {
	checkRoutes,
	getDirectoryPathsRecursive,
	isPortAvailable,
	processRoutes,
} from "../utils/utils";
import handleServer from "./handleServer";

export function Server() {
	let nConfig: Config;

	return {
		config: (config: Config) => {
			nConfig = config;
		},
		serve: async (callback?: () => void) => {
			const chalk = new Chalk();
			const bootTime = Date.now();
			// const BASE_PATH = `${appRootPath.path}/src/routes`
			const packageRoot = nConfig.root;
			const BASE_PATH = `${packageRoot}/src/routes`;
			const routes: Array<Route> = [];
			const portInUse = await isPortAvailable(nConfig.port);
			/**
			 * Checking if port is available for use and failing early
			 */
			if (portInUse.isInUse) {
				signale.error("Port is already in use by another process.");
				process.exit(1);
			}

			/**
			 * * Getting ip addresss and printing ports
			 */

			const ip = await import("ip");

			const localLabel = "Local: ".padEnd(10);   // "Local:    "
			const networkLabel = "Network: ".padEnd(10); // "Network:  "

			signale.log(`\n${localLabel}`, `http://localhost:${nConfig.port}`);
			signale.log(networkLabel, `http://${ip.address()}:${nConfig.port}\n`);
						/**
			 * Checking Route Directories
			 */
			const dirs = await getDirectoryPathsRecursive(BASE_PATH);

			if (!dirs.length) {
				signale.error(
					"Routes Not Found:",
					"Please add +routes files in ./src/routes/<base-route>/+route",
				);
				process.exit(1);
			}

			/**
			 * Process
			 */
			for (const dir of dirs) {
				const route: string = dir.split("src/routes")[1] ?? "/";
				const baseRoute = route.replace("[id]", ":id");
				routes.push({
					baseRoute,
					subRoutes: [],
					filePath: dir,
				});
			}

			/**
			 * Checking if routes are valid
			 */
			for (const route of routes) {
				checkRoutes(`${route.filePath}/+route.ts`);
			}

			/**
			 * Processing Routes
			 * Adds Middleware to Routes from Decorators (if any)
			 */
			await Promise.all(
				routes.map(async (e, index) => {
					const pResult = await processRoutes(`${e.filePath}/+route.ts`);
					routes[index]!.subRoutes = pResult ?? [];
				}),
			);

			const server = createServer(async (req: any, res) => {
				/**
				 * All server events handler
				 */
				handleServer({
					req,
					res,
					routes,
				});
			});

			server.listen(nConfig.port, "0.0.0.0", async () => {
				if (callback !== undefined) {
					callback();
				} else {
					const startTime = Date.now();
					const bootDuration = ((startTime - bootTime) / 1000).toFixed(2);
					signale.info(chalk.yellow("Booting Up..."));
					signale.success(`Server is ready! (${bootDuration}s)`, '\n\n');
				}
			});
		},
	};
}
