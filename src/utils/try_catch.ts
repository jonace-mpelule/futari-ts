type Result<T = unknown, E = unknown> = {
	ok?: T;
	err?: E;
};

export default async function TryCatch<T, E>(
	fn: () => Promise<T> | T,
): Promise<Result<T, E>> {
	try {
		const result = await fn();
		return {
			ok: result,
			err: undefined,
		};
	} catch (err) {
		return {
			ok: undefined,
			err: err as E,
		};
	}
}
