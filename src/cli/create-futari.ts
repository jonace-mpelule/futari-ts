#!/usr/bin/env node
import path from "node:path";
import { createFutariProject } from "./scaffold";

async function main() {
	const args = process.argv.slice(2);
	const projectArg = args.find((arg) => !arg.startsWith("-"));
	const force = args.includes("--force");

	if (!projectArg) {
		printUsage();
		process.exitCode = 1;
		return;
	}

	const projectName = path.basename(projectArg);
	const targetDir = path.resolve(projectArg);
	const createdPath = await createFutariProject({
		projectName,
		targetDir,
		force,
	});

	console.log(`Created Futari project in ${createdPath}`);
	console.log("Next steps:");
	console.log(`  cd ${projectArg}`);
	console.log("  bun install");
	console.log("  bun run dev");
}

function printUsage() {
	console.log("Usage: create-futari <project-name> [--force]");
}

main().catch((error) => {
	console.error(
		error instanceof Error ? error.message : "Failed to create Futari project",
	);
	process.exit(1);
});
