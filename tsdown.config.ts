import { defineConfig } from "tsdown";

export default defineConfig({
	entry: {
		index: "./src/index.ts",
		"create-futari": "./src/cli/create-futari.ts",
	},
	clean: true,
	outDir: "build",
	target: "ES2022",
	format: "esm",
	sourcemap: true,
	minify: true,
	dts: true,
});
