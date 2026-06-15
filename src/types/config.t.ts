import type { BehaviorConfig } from "./behavior.t";

export type Config = {
	cors: boolean;
	/**
	 * @description - Root path of your project file
	 * @example - root: proccess.cwd()
	 */
	root: string;

	port: number;
	compressionEnabled?: boolean;
	behaviors?: BehaviorConfig;
};
