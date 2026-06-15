import { createHmac, timingSafeEqual } from "node:crypto";
import type { JwtOptions } from "../types/behavior.t";

function base64Url(input: Buffer | string) {
	return Buffer.from(input)
		.toString("base64")
		.replace(/=/g, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_");
}

function decodeBase64Url(input: string) {
	const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
	return Buffer.from(normalized, "base64").toString("utf8");
}

function signPart(value: string, secret: string) {
	return base64Url(createHmac("sha256", secret).update(value).digest());
}

export function jwt(options: JwtOptions) {
	return {
		async sign(payload: Record<string, unknown>) {
			const now = Math.floor(Date.now() / 1000);
			const claims = {
				...payload,
				...(options.issuer ? { iss: options.issuer } : {}),
				...(options.audience ? { aud: options.audience } : {}),
				...(options.expiresIn ? { exp: now + options.expiresIn } : {}),
				iat: now,
			};
			const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
			const body = base64Url(JSON.stringify(claims));
			const signature = signPart(`${header}.${body}`, options.secret);
			return `${header}.${body}.${signature}`;
		},
		async verify(token: string) {
			const [header, body, signature] = token.split(".");
			if (!header || !body || !signature) {
				throw new Error("Invalid JWT");
			}

			const expected = signPart(`${header}.${body}`, options.secret);
			const actualBuffer = Buffer.from(signature);
			const expectedBuffer = Buffer.from(expected);
			if (
				actualBuffer.length !== expectedBuffer.length ||
				!timingSafeEqual(actualBuffer, expectedBuffer)
			) {
				throw new Error("Invalid JWT signature");
			}

			const payload = JSON.parse(decodeBase64Url(body)) as Record<
				string,
				unknown
			>;
			const now = Math.floor(Date.now() / 1000);

			if (typeof payload.exp === "number" && payload.exp < now) {
				throw new Error("JWT expired");
			}
			if (options.issuer && payload.iss !== options.issuer) {
				throw new Error("Invalid JWT issuer");
			}
			if (options.audience && payload.aud !== options.audience) {
				throw new Error("Invalid JWT audience");
			}

			return payload;
		},
		guard(required = true) {
			return {
				service: this,
				required,
			};
		},
	};
}
