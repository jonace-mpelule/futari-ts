/** biome-ignore-all lint/suspicious/noExplicitAny: <'explanation'> */
/** biome-ignore-all lint/correctness/noUnusedFunctionParameters: <'explanation'> */

import Reflet from "reflect-metadata";
import { v4 as uuidV4, v5 as uuidv5 } from "uuid";
import {
	DEF_ROUTE_KEY,
	MIDDLEWARE_KEY,
	ROUTES_KEY,
} from "../constants/symbols.constants";
import type { Context, Method, Middleware, SubRoute } from "../types/network";

export const ROUTE_NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

const _ = Reflet;

export function DefRoute() {
	return (target: any) => {
		/**
		 * Id to identify the class in case of colliding class names
		 */
		const id: string = uuidV4();

		Reflect.defineMetadata(
			DEF_ROUTE_KEY,
			{
				id,
				isRouter: true,
			},
			target,
		);
	};
}

export function Use(fn: (ctx: Context) => void) {
	return (target: any, key: string, descriptor?: PropertyDescriptor) => {
		const controller = target.constructor;
		/**
		 * * Getting Class Metadata
		 */
		const defRouteData = Reflect.getMetadata(DEF_ROUTE_KEY, controller);
		const middlewares =
			(Reflect.getMetadata(MIDDLEWARE_KEY, controller) as Array<Middleware>) ||
			[];

		/**
		 * * Route x Attached Middleware Unique Id
		 */
		const handlerId = uuidv5(`${defRouteData?.id}:${key}`, ROUTE_NAMESPACE);

		middlewares.push({
			id: handlerId,
			handlerKey: key,
			handler: fn,
		});

		Reflect.defineMetadata(MIDDLEWARE_KEY, middlewares, controller);

		// const handlerId = uuidv5(
		// 	`${controllerName}:GET:${path}:${key}`,
		// 	ROUTE_NAMESPACE
		//   );

		// target.__middlewares.push({
		// 	id: handlerId,
		// 	handlerKey: key,
		// 	handler: fn,
		// });
	};
}

export function Get(path: string) {
	return (target: any, key: string, descriptor?: PropertyDescriptor) => {
		const controller = target.constructor;
		/**
		 * * Getting Class Metadata
		 */
		const defRouteData = Reflect.getMetadata(DEF_ROUTE_KEY, controller);

		const routes =
			(Reflect.getMetadata(ROUTES_KEY, controller) as Array<SubRoute>) || [];

		/**
		 * * Route Unique Id
		 */
		const handlerId = uuidv5(`${defRouteData?.id}:${key}`, ROUTE_NAMESPACE);

		routes.push({
			id: handlerId,
			method: "GET",
			path,
			handlerKey: key,
			middlewares: [],
		});

		Reflect.defineMetadata(ROUTES_KEY, routes, controller);
	};
}

export function Post(path: string) {
	return (target: any, key: string, descriptor?: PropertyDescriptor) => {
		/**
		 * @description Off Shore Metadata Registration
		 */
		RegisterRouteMeta({
			key, 
			target,
			path, 
			method: 'POST'
		})
	};
}

export function Put(path: string) {
	return (target: any, key: string, descriptor?: PropertyDescriptor) => {
			/**
		 * @description Off Shore Metadata Registration
		 */
			RegisterRouteMeta({
				key, 
				target,
				path, 
				method: 'PUT'
			})
	};
}

export function Patch(path: string) {
	return (target: any, key: string, descriptor?: PropertyDescriptor) => {
			/**
		 * @description Off Shore Metadata Registration
		 */
			RegisterRouteMeta({
				key, 
				target,
				path, 
				method: 'PATCH'
			})
	};
}

export function Delete(path: string) {
	return (target: any, key: string, descriptor?: PropertyDescriptor) => {
			/**
		 * @description Off Shore Metadata Registration
		 */
			RegisterRouteMeta({
				key, 
				target,
				path, 
				method: 'DELETE'
			})
	};
}

export function Head(path: string) {
	return (target: any, key: string, descriptor?: PropertyDescriptor) => {
			/**
		 * @description Off Shore Metadata Registration
		 */
			RegisterRouteMeta({
				key, 
				target,
				path, 
				method: 'HEAD'
			})
	};
}

export function Options(path: string) {
	return (target: any, key: string, descriptor?: PropertyDescriptor) => {
			/**
		 * @description Off Shore Metadata Registration
		 */
			RegisterRouteMeta({
				key, 
				target,
				path, 
				method: 'OPTIONS'
			})
	};
}

export function Connect(path: string) {
	return (target: any, key: string, descriptor?: PropertyDescriptor) => {
			/**
		 * @description Off Shore Metadata Registration
		 */
			RegisterRouteMeta({
				key, 
				target,
				path, 
				method: 'CONNECT'
			})
	};
}

export function Trace(path: string) {
	return (target: any, key: string, descriptor?: PropertyDescriptor) => {
			/**
		 * @description Off Shore Metadata Registration
		 */
			RegisterRouteMeta({
				key, 
				target,
				path, 
				method: 'TRACE'
			})
	};
}


function RegisterRouteMeta({key, target, path, method}: {key: any, target: any, path: string, method: Method}) {
	const controller = target.constructor;
	/**
	 * * Getting Class Metadata
	 */
	const defRouteData = Reflect.getMetadata(DEF_ROUTE_KEY, controller);

	const routes =
		(Reflect.getMetadata(ROUTES_KEY, controller) as Array<SubRoute>) || [];

	/**
	 * * Route Unique Id
	 */
	const handlerId = uuidv5(`${defRouteData?.id}:${key}`, ROUTE_NAMESPACE);

	routes.push({
		id: handlerId,
		method,
		path,
		handlerKey: key,
		middlewares: [],
	});

	Reflect.defineMetadata(ROUTES_KEY, routes, controller);
}
