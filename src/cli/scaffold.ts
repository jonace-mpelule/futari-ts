import fs from "node:fs/promises";
import path from "node:path";

export type CreateFutariOptions = {
	projectName: string;
	targetDir: string;
	force?: boolean;
};

const files = {
	".gitignore": `node_modules
.futari
dist
build
.DS_Store
`,
	"README.md": `# __PROJECT_NAME__

## Install

\`\`\`bash
bun install
\`\`\`

## Run

\`\`\`bash
bun run dev
\`\`\`

## Build Manifest And Start

\`\`\`bash
bun run build
\`\`\`
`,
	"tsconfig.json": `{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "Preserve",
    "moduleDetection": "force",
    "allowJs": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "types": ["bun", "node"]
  }
}
`,
	"package.json": `{
  "name": "__PROJECT_NAME__",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun run src/index.ts --build",
    "build": "bun run src/index.ts --build",
    "start": "bun run src/index.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "futari": "latest",
    "reflect-metadata": "^0.2.2"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/node": "^24.10.1",
    "typescript": "^5"
  }
}
`,
	"src/index.ts": `import { Server } from "futari";

const app = Server();

app.config({
  root: process.cwd(),
  port: 3000,
});

await app.serve(() => {
  console.log("Futari server running on http://localhost:3000");
});
`,
	"src/routes/health/+route.ts": `import { DefRoute, Get, RouteHandler, Status } from "futari";

@DefRoute()
export default class HealthRoute {
  @Get("/")
  health = RouteHandler(async () => {
    return {
      status: "ok",
      code: Status.OK,
    };
  });
}
`,
};

export async function createFutariProject({
	projectName,
	targetDir,
	force = false,
}: CreateFutariOptions) {
	const resolvedTarget = path.resolve(targetDir);
	await ensureTargetDirectory(resolvedTarget, force);

	for (const [relativePath, template] of Object.entries(files)) {
		const destination = path.join(resolvedTarget, relativePath);
		await fs.mkdir(path.dirname(destination), { recursive: true });
		await fs.writeFile(
			destination,
			template.replaceAll("__PROJECT_NAME__", projectName),
			"utf8",
		);
	}

	return resolvedTarget;
}

async function ensureTargetDirectory(targetDir: string, force: boolean) {
	try {
		const stats = await fs.stat(targetDir);
		if (!stats.isDirectory()) {
			throw new Error(`Target exists and is not a directory: ${targetDir}`);
		}
		const entries = await fs.readdir(targetDir);
		if (entries.length > 0 && !force) {
			throw new Error(
				`Target directory is not empty: ${targetDir}. Use --force to scaffold into it.`,
			);
		}
	} catch (error) {
		const nodeError = error as NodeJS.ErrnoException;
		if (nodeError.code === "ENOENT") {
			await fs.mkdir(targetDir, { recursive: true });
			return;
		}
		throw error;
	}
}
