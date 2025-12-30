/** biome-ignore-all lint/suspicious/useIterableCallbackReturn: <'explanation'> */
/** biome-ignore-all lint/style/noNonNullAssertion: <'explanation'> */
import fs from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { Chalk } from "chalk";
import signale from "signale";
import type { Config } from "../types/config.t";
import type { RuntimeRoutes } from "../types/runtime.t";
import { isPortAvailable } from "../utils/utils";
import BuildManifest from "./buildManifest";
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

			// build manifest here
			await BuildManifest(nConfig.root);

			const __manifest_path = path.join(
				nConfig.root,
				"./.futari",
				"manifest.js",
			);
			const exists = await fs.exists(__manifest_path);
;
			if (!exists) {
				signale.log("Error: Manifest Not Found. Please run build command");
				process.exit(1);
			}

			const __manifest = await import(__manifest_path);
			const routes: Array<RuntimeRoutes> = __manifest.default.routes;



			// const routes: Array<Route> = [];
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

			const localLabel = "Local: ".padEnd(10); // "Local:    "
			const networkLabel = "Network: ".padEnd(10); // "Network:  "

			signale.log(`\n${localLabel}`, `http://localhost:${nConfig.port}`);
			signale.log(networkLabel, `http://${ip.address()}:${nConfig.port}\n`);
			
			


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
					signale.success(`Server is ready! (${bootDuration}s)`, "\n\n");
				}
			});
		},
	};
}
