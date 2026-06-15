import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createFutariProject } from "../src/cli/scaffold";

describe("create-futari scaffold", () => {
	test("creates a runnable project skeleton", async () => {
		const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "create-futari-"));
		const projectDir = path.join(tempRoot, "demo-app");

		await createFutariProject({
			projectName: "demo-app",
			targetDir: projectDir,
		});

		const packageJson = JSON.parse(
			await fs.readFile(path.join(projectDir, "package.json"), "utf8"),
		);
		const indexFile = await fs.readFile(
			path.join(projectDir, "src/index.ts"),
			"utf8",
		);
		const routeFile = await fs.readFile(
			path.join(projectDir, "src/routes/health/+route.ts"),
			"utf8",
		);

		expect(packageJson.name).toBe("demo-app");
		expect(packageJson.scripts.dev).toBe("bun run src/index.ts --build");
		expect(indexFile).toContain('import { Server } from "futari"');
		expect(routeFile).toContain("@DefRoute()");
		expect(routeFile).toContain('status: "ok"');
	});

	test("refuses to scaffold into a non-empty directory unless forced", async () => {
		const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "create-futari-"));
		await fs.writeFile(path.join(tempRoot, "existing.txt"), "present", "utf8");

		await expect(
			createFutariProject({
				projectName: "demo-app",
				targetDir: tempRoot,
			}),
		).rejects.toThrow("Target directory is not empty");
	});
});
