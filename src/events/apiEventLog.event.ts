import chalk from "chalk";
import signale from "signale";
import { EventEmitter } from "./eventemitter.config.ts";

const METHOD_WIDTH = 6;
const STATUS_WIDTH = 6;
const PATH_WIDTH = 10;

function pad(value: string, width: number) {
	return value.length >= width
		? value.slice(0, width)
		: value.padEnd(width, " ");
}

function colorStatus(status: number) {
	if (status >= 500) return chalk.red(status);
	if (status >= 400) return chalk.yellow(status);
	if (status >= 300) return chalk.cyan(status);
	return chalk.green(status);
}

function colorDuration(ms: number) {
	if (ms > 1000) return chalk.red(`${ms.toFixed(3)}ms`);
	if (ms > 500) return chalk.yellow(`${ms.toFixed(3)}ms`);
	return chalk.grey(`${ms.toFixed(3)}ms`);
}

type EventMap = {
	"api:log": [
		startTime: number,
		routePath: string | undefined,
		method: string | undefined,
		status: number,
	];
};

const apiEventLog = new EventEmitter<EventMap>();
// log user activity

apiEventLog.on(
	"api:log",
	(
		startTime: number,
		routePath: string | undefined,
		method: string | undefined,
		status: number,
	) => {
		const duration = performance.now() - startTime;

		const methodCol = pad(method?.toUpperCase() ?? "GET", METHOD_WIDTH);
		const statusCol = pad(status.toString(), STATUS_WIDTH);
		const pathCol = pad(routePath ?? "/", PATH_WIDTH);

		signale.log(
			chalk.bold(methodCol),
			colorStatus(Number(statusCol)),
			pathCol,
			colorDuration(duration),
		);
	},
);

export { apiEventLog };
