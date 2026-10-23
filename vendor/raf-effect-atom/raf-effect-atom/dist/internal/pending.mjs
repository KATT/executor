import * as Hydration from "effect/reactivity/Hydration";
import * as Predicate from "effect/Predicate";
// src/internal/pending.ts
const held = /* @__PURE__ */ new WeakMap();
const pending = /* @__PURE__ */ new WeakMap();
/** Each key's latest stream, kept once it settles. */
const streams = /* @__PURE__ */ new WeakMap();
/** The promise of a streamed result still on its way, if there is one. */
const get = (registry, key) => pending.get(registry)?.get(key);
/**
* The promise of a key's streamed result, settled or not. A component that
* suspended on it with `React.use` must call `React.use` again when React
* retries it, or React reports a conditional `use`. Once settled, it's
* marked fulfilled the way React marks the thenables it tracks, so `use`
* returns at once instead of suspending again.
*/
const stream = (registry, key) => streams.get(registry)?.get(key);
const hold = (registry, entry, result) => {
	let entries = held.get(registry);
	if (entries === void 0) {
		entries = /* @__PURE__ */ new WeakSet();
		held.set(registry, entries);
	}
	if (entries.has(entry)) return;
	entries.add(entry);
	let byKey = pending.get(registry);
	if (byKey === void 0) {
		byKey = /* @__PURE__ */ new Map();
		pending.set(registry, byKey);
	}
	if (byKey.has(entry.key)) return;
	let latest = streams.get(registry);
	if (latest === void 0) {
		latest = /* @__PURE__ */ new Map();
		streams.set(registry, latest);
	}
	const owner = byKey;
	const done = () => {
		owner.delete(entry.key);
	};
	const fulfilled = () => {
		Object.assign(promise, {
			status: "fulfilled",
			value: void 0
		});
	};
	const promise = Promise.resolve(result).then((value) => {
		done();
		if (!Predicate.isSymbol(value)) {
			const resolved = {
				...entry,
				resultPromise: void 0,
				value
			};
			Hydration.hydrate(registry, [resolved]);
		}
		fulfilled();
	}, () => {
		done();
		fulfilled();
	});
	owner.set(entry.key, promise);
	latest.set(entry.key, promise);
};
/**
* Holds back each streamed entry of `state` until its promise resolves, and
* returns the settled ones.
*/
const split = (registry, state) => {
	const settled = [];
	for (const entry of Hydration.toValues(Array.from(state))) if (entry.resultPromise === void 0) settled.push(entry);
	else hold(registry, entry, entry.resultPromise);
	return settled;
};
export { get, split, stream };
