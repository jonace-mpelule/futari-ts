import { build } from "tsdown";
import { getDirectoryPathsRecursive, silenceLogs } from "../utils/utils";

/**
 * @description
 *
 *
 */
export default async function MiddlewareManifestScanner(basePath: string) {
	const MIDDLEWARE_PATH = `${basePath}/src/middlewares`;

	console.log(MIDDLEWARE_PATH);

	try {
		const entries = await getDirectoryPathsRecursive(MIDDLEWARE_PATH);

		console.log("entries: ", entries);
		if (!entries.length) {
			return;
		}

		await buildFile({
			filePaths: entries,
			root: basePath,
		});
	} catch {}
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
			outDir: `${root}/.futari/middleware/chunks`,
			format: "esm",
			skipNodeModulesBundle: false,
			unbundle: false,
			clean: true,
			logLevel: "silent",
			sourcemap: false,
		}),
	);

	return [...result.flatMap((e) => e.chunks.map((e) => e.fileName))].slice(
		0,
		-1,
	);
}
