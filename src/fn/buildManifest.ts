/** biome-ignore-all lint/style/noNonNullAssertion: <explanation> */
/** biome-ignore-all lint/suspicious/noNonNullAssertedOptionalChain: <explanation> */
/** biome-ignore-all lint/style/useTemplate: <explanation> */
import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";
import { build } from "tsdown";
import type { Route } from "../types/network";
import {
	checkRoutes,
	getDirectoryPathsRecursive,
	processRoutes,
	silenceLogs,
} from "../utils/utils";

export default async function BuildManifest(root: string) {
	await fs.promises.mkdir(path.join(root, ".futari"), {
		recursive: true,
	});

	const BASE_PATH = `${root}/src/routes`;
	const dirs = await getDirectoryPathsRecursive(BASE_PATH);
	const routes: Array<Route> = [];
	// const manifestPath = path.join(root, ".futari");

	for (const dir of dirs) {
		const route: string = dir.split("src/routes")[1] ?? "/";
		const baseRoute = route.replace("[id]", ":id");
		routes.push({
			baseRoute,
			subRoutes: [],
			filePath: dir,
		});
	}
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

	const routesObj = routes.flatMap((route) =>
		route.subRoutes.map((subRoute) => ({
			[`${subRoute.method}:${route.baseRoute}${subRoute.path}`]: "",
		})),
	);

	const importsMap = new Map();
	const validRoutes = routes.filter(
		(e) => e.filePath !== null || e.filePath !== "",
	);

	const buildResult = await buildFile({
		filePaths: validRoutes.map((e) => e.filePath + "/+route.ts"),
		root,
	});
	console.log(buildResult);

	for (let i = 0; i < buildResult.length; i++) {
		validRoutes[i]!.filePath = buildResult[i]!;
		const className = `__Route__${importsMap.size}__`;
		importsMap.set(validRoutes[i]?.filePath, { className, path: buildResult[i] });
	}


	// for (const route of routes) {
	// 	if (!importsMap.has(route.filePath)) {
	// 		console.log(1, 'working on file')
	// 		 // unique identifier

	// 		/**
	// 		 * Build File
	// 		 */
	// 		console.log('file result:', buildResult)
	// 		const importPath = path
	// 			.relative(manifestPath, route.filePath)
	// 			.replace(/\\/g, "/");
	// 		
	// 	}
	// }

	const importLines = [...importsMap.values()]
		.map((i) => `import ${i.className} from './chunks/${i.path}'`)
		.join("\n");

	// Step 3: Instantiate each class
	const instancesLines = [...importsMap.values()]
		.map((i) => `const ${i.className.toLowerCase()} = new ${i.className}()`)
		.join("\n");

	const routeLines = validRoutes
		.flatMap((route) => {
			const { className } = importsMap.get(route.filePath);
			const instanceName = className.toLowerCase();
			return route.subRoutes.map((subRoute) => {
				return `{ method: '${subRoute.method}', path: '${route.baseRoute}${subRoute.path}', handler: ${instanceName}.${subRoute.handlerKey}.bind(${instanceName}), middlewares: [] }`;
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

function toImportPath(from: string, file: string) {
	return `${path.relative(from, file).replace(/\\/g, "/")}`;
}

export async function buildFile({
	filePaths,
	root,
}: {
	filePaths: Array<string>;
	root: string;
}): Promise<Array<string>> {
	const result = await silenceLogs(() =>
		build({
			entry: filePaths,
			outDir: `${root}/.futari/chunks`,
			format: "esm",
			skipNodeModulesBundle: false,
			unbundle: false,
			clean: true,
			logLevel: "silent",
			sourcemap: false,
		}),
	);

	return [...result.flatMap((e) => e.chunks.map((e) => e.fileName))].slice(0,-1);
}
