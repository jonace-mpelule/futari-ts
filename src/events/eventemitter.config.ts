/** biome-ignore-all lint/style/noNonNullAssertion: <'explanation'> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <"explanation"> */

type Listener<T extends Array<any>> = (...args: T) => void;

export class EventEmitter<EventMap extends Record<string, Array<any>>> {
	private eventListeners: {
		[K in keyof EventMap]?: Set<Listener<EventMap[K]>>;
	} = {};

	on<K extends keyof EventMap>(eventName: K, listener: Listener<EventMap[K]>) {
		const listeners = this.eventListeners[eventName] ?? new Set();
		listeners.add(listener);
		this.eventListeners[eventName] = listeners;
	}

	emit<K extends keyof EventMap>(eventName: K, ...args: EventMap[K]) {
		const listeners = this.eventListeners[eventName];
		for (const listener of listeners!) {
			listener(...args);
		}
	}
}
