import { keyOf } from "./leases.mjs";
import * as Predicate from "effect/Predicate";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as React from "react";
// src/internal/waterfalls.ts
const ModeContext = React.createContext("warn");
const docs = "https://raf-effect-atom.katt.dev/docs/request-waterfalls";
/** Whether the registry has `atom`'s node, or a hydrated value for it. */
const isStarted = (registry, atom) => {
	const key = keyOf(atom);
	return registry.getNodes().has(key) || Predicate.isString(key) && registry.preloadedSerializable.has(key);
};
const isLoading = (node) => {
	const value = Option.getOrUndefined(node.valueOption());
	return AsyncResult.isAsyncResult(value) && AsyncResult.isInitial(value);
};
/**
* The nodes `registry.get` created that load on their own: `Initial`, with
* no `Initial` parent. A derived atom over a source that is loading or
* loaded isn't one, so reading through `Atom.map` or a wrapper over an atom
* a loader started reports nothing.
*/
const startedLoading = (registry, atom, before) => {
	const root = registry.getNodes().get(keyOf(atom));
	const started = [];
	const seen = /* @__PURE__ */ new Set();
	const queue = root === void 0 ? [] : [root];
	for (const node of queue) {
		if (seen.has(node) || before.has(keyOf(node.atom))) continue;
		seen.add(node);
		if (isLoading(node) && !Array.from(node.parents).some(isLoading)) started.push(node);
		queue.push(...node.parents);
	}
	return started;
};
const nameOf = (atom) => {
	const key = keyOf(atom);
	return atom.label?.[0] ?? (Predicate.isString(key) ? key : "an atom");
};
const message = (read, started) => `raf-effect-atom: rendering ${read === started ? `read ${read}` : `read ${read}, which started ${started}`} before anything else had started it, so its request waits for this render: a request waterfall. Start it before render and pass its handle down, from the route's loader or the server component (atoms.prefetch(source, ...args) or atoms.ensure). If the state that picks it, such as a page, a filter or an open dialog, isn't in the URL, put it there so the loader can. As escape hatches for state that can't be in the URL: start it in the event handler that changes the state (Loader.make(registry).prefetch), or, if its input only exists in render, read it with useAtomResult(source, useWaterfall(source, ...args)). ${docs}`;
const warned = /* @__PURE__ */ new WeakMap();
/**
* The nodes a read started in throw mode, with the error. React renders a
* component that threw once more before it gives up, and that render finds
* the node, so the error stays with the node.
*/
const thrown = /* @__PURE__ */ new WeakMap();
/**
* Reads `atom`, reporting by `mode` when the read starts an atom no loader,
* server component, event handler or `useWaterfall` started. Development
* only: callers skip it in production builds.
*/
const check = (registry, atom, mode) => {
	if (mode === "off") return;
	if (isStarted(registry, atom)) {
		const node = registry.getNodes().get(keyOf(atom));
		const error = mode === "throw" && node ? thrown.get(node) : void 0;
		if (error !== void 0) throw error;
		return;
	}
	const before = new Set(registry.getNodes().keys());
	registry.get(atom);
	const first = startedLoading(registry, atom, before)[0];
	if (first === void 0) return;
	const text = message(nameOf(atom), nameOf(first.atom));
	if (mode === "throw") {
		const error = new Error(text);
		const node = registry.getNodes().get(keyOf(atom));
		if (node !== void 0) thrown.set(node, error);
		throw error;
	}
	let seen = warned.get(registry);
	if (seen === void 0) {
		seen = /* @__PURE__ */ new Set();
		warned.set(registry, seen);
	}
	if (!seen.has(text)) {
		seen.add(text);
		console.warn(text);
	}
};
export { ModeContext, check, isStarted };
