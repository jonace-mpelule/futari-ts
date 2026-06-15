import type { IncomingMessage } from "node:http";

export default async function Parse(req: IncomingMessage): Promise<unknown> {
	return new Promise((resolve, reject) => {
		let body = "";
		req.on("data", (chunk: Buffer) => {
			body += chunk.toString();
		});

		req.on("error", () => {
			reject(new Error("Error parsing request body"));
		});

		req.on("end", () => {
			if (!body.trim()) {
				resolve(undefined);
				return;
			}

			try {
				resolve(JSON.parse(body));
			} catch {
				reject(new SyntaxError("Malformed JSON body"));
			}
		});
	});
}
