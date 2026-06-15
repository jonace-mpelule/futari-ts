import type { FutariLogger } from "../types/behavior.t";

type ExternalLogger = Record<string, unknown>;

function callLogger(
	logger: ExternalLogger,
	level: keyof FutariLogger,
	message: string,
	meta?: Record<string, unknown>,
) {
	const method = logger[level];
	if (typeof method === "function") {
		method.call(logger, message, meta);
	}
}

export function winstonAdapter(logger: ExternalLogger): FutariLogger {
	return {
		debug: (message, meta) => callLogger(logger, "debug", message, meta),
		info: (message, meta) => callLogger(logger, "info", message, meta),
		warn: (message, meta) => callLogger(logger, "warn", message, meta),
		error: (message, meta) => callLogger(logger, "error", message, meta),
	};
}

export function bunyanAdapter(logger: ExternalLogger): FutariLogger {
	return {
		debug: (message, meta) => callLogger(logger, "debug", message, meta),
		info: (message, meta) => callLogger(logger, "info", message, meta),
		warn: (message, meta) => callLogger(logger, "warn", message, meta),
		error: (message, meta) => callLogger(logger, "error", message, meta),
	};
}
