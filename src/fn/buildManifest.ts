import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import prettier from "prettier";
import { build } from "tsdown";
import type { Route, RouteController } from "../types/network";
import {
	checkRoutes,
	getDirectoryPathsRecursive,
	silenceLogs,
} from "../utils/utils";

export default async function BuildManifest(root: string) {
	await fs.promises.mkdir(path.join(root, ".futari"), {
		recursive: true,
	});

	const basePath = path.join(root, "src", "routes");
	const routeDirs = await getDirectoryPathsRecursive(basePath);
	const routeEntries = await Promise.all(
		routeDirs.map(async (dir) => {
			const routeFile = path.join(dir, "+route.ts");
			try {
				await fs.promises.access(routeFile);
			} catch {
				return null;
			}

			const route = dir.split("src/routes")[1] ?? "/";
			return {
				baseRoute: normalizeRoutePath(route.replace(/\[([^\]]+)\]/g, ":$1")),
				subRoutes: [],
				filePath: dir,
			};
		}),
	);
	const routes: Array<Route> = routeEntries.filter((route) => route !== null);

	await Promise.all(
		routes.map((route) => checkRoutes(`${route.filePath}/+route.ts`)),
	);

	const validRoutes = routes.filter((route) => route.filePath);
	const buildResult = await buildFile({
		filePaths: validRoutes.map((route) => `${route.filePath}/+route.ts`),
		root,
	});

	const manifestRoutes = await Promise.all(
		validRoutes.map(async (route, index) => {
			const chunkPath = buildResult[index];
			if (!chunkPath) {
				throw new Error(`Missing build output for route ${route.filePath}`);
			}
			const modulePath = path.join(root, ".futari", "chunks", chunkPath);
			const module = await import(
				`${pathToFileURL(modulePath).href}?t=${Date.now()}`
			);
			const controller = module.default as RouteController;
			const subRoutes = (controller.__futari_routes ?? []).map((subRoute) => ({
				...subRoute,
				middlewares: (controller.__futari_middlewares ?? []).filter(
					(middleware) =>
						middleware.id === subRoute.id &&
						middleware.handlerKey === subRoute.handlerKey,
				),
				behavior: mergeBehaviors(
					(controller.__futari_behaviors ?? [])
						.filter(
							(behavior) =>
								behavior.id === subRoute.id &&
								behavior.handlerKey === subRoute.handlerKey,
						)
						.map((behavior) => behavior.config),
				),
			}));

			return {
				...route,
				chunkPath,
				className: `__Route__${index}__`,
				subRoutes,
			};
		}),
	);

	const importLines = manifestRoutes
		.map(
			(route) => `import ${route.className} from './chunks/${route.chunkPath}'`,
		)
		.join("\n");

	const instancesLines = manifestRoutes
		.map(
			(route) =>
				`const ${route.className.toLowerCase()} = new ${route.className}()`,
		)
		.join("\n");

	const routeLines = manifestRoutes
		.flatMap((route) => {
			const instanceName = route.className.toLowerCase();
			return route.subRoutes.map((subRoute) => {
				return `{ id: '${subRoute.id}', method: '${subRoute.method}', path: '${normalizeRoutePath(`${route.baseRoute}${subRoute.path}`)}', handler: ${instanceName}.${subRoute.handlerKey}.bind(${instanceName}), middlewares: getMiddlewares(${route.className}, '${subRoute.id}'), behavior: getBehavior(${route.className}, '${subRoute.id}') }`;
			});
		})
		.join(",\n");

	const code = `
        /**
         * ! IMPORTANT FILE - DO NOT DELETE
         *
         * This manifest file is generated at build time.
         * It contains all route definitions for the backend framework.
         *
         * Each route includes:
         *   - HTTP method
         *   - Full path
         *   - Handler function (bound to its class instance)
         *   - Optional middlewares
         *
         * The imports and class instances are fully resolved at build time,
         * so no filesystem scanning or dynamic imports are required at runtime.
         */

        ${importLines}

        function getMiddlewares(controller, routeId) {
          return (controller.__futari_middlewares ?? [])
            .filter((middleware) => middleware.id === routeId)
            .map((middleware) => middleware.handler)
        }

        function mergeBehaviors(configs) {
          return configs.reduce((merged, config) => ({
            ...merged,
            ...config,
            guards: [...(merged.guards ?? []), ...(config.guards ?? [])],
          }), {})
        }

        function getBehavior(controller, routeId) {
          return mergeBehaviors(
            (controller.__futari_behaviors ?? [])
              .filter((behavior) => behavior.id === routeId)
              .map((behavior) => behavior.config)
          )
        }

        /**
         * Instances of route classes
         * Each class is instantiated once and reused for all its subRoutes
         */
        ${instancesLines}

        /**
         * Exported routes array
         * Each object contains:
         *  - method: HTTP verb (GET, POST, etc.)
         *  - path: full route path
         *  - handler: class method bound to instance
         *  - middlewares: array of middleware functions
         */
        export default {
          routes: [
            ${routeLines}
          ]
        }
        `.trim();

	const formatted = await prettier.format(code, {
		parser: "babel",
	});

	await fs.promises.writeFile(
		path.join(root, ".futari", "manifest.js"),
		formatted,
	);
}

function mergeBehaviors(
	configs: Array<import("../types/behavior.t").BehaviorConfig>,
) {
	const merged: import("../types/behavior.t").BehaviorConfig = {};
	for (const config of configs) {
		Object.assign(merged, config);
		merged.guards = [...(merged.guards ?? []), ...(config.guards ?? [])];
	}
	return merged;
}

function normalizeRoutePath(routePath: string) {
	const normalized = routePath.replace(/\/+/g, "/");
	if (normalized.length > 1 && normalized.endsWith("/")) {
		return normalized.slice(0, -1);
	}
	return normalized || "/";
}

export async function buildFile({
	filePaths,
	root,
}: {
	filePaths: Array<string>;
	root: string;
}): Promise<Array<string>> {
	if (!filePaths.length) return [];

	const entries = Object.fromEntries(
		filePaths.map((filePath, index) => [`route-${index}`, filePath]),
	);
	const result = await silenceLogs(() =>
		build({
			entry: entries,
			outDir: `${root}/.futari/chunks`,
			format: "esm",
			skipNodeModulesBundle: false,
			unbundle: false,
			clean: true,
			logLevel: "silent",
			sourcemap: false,
		}),
	);

	const chunks = result.flatMap((output) => output.chunks);
	return filePaths.map((filePath) => {
		const resolved = path.resolve(filePath);
		const chunk = chunks.find((chunk) => {
			const facadeModuleId =
				"facadeModuleId" in chunk ? chunk.facadeModuleId : undefined;
			return facadeModuleId ? path.resolve(facadeModuleId) === resolved : false;
		});

		if (!chunk) {
			throw new Error(`Unable to resolve build output for route ${filePath}`);
		}

		return chunk.fileName;
	});
}
