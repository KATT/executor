import * as Predicate from "effect/Predicate";
// src/internal/failedReads.ts
const failedReads = /* @__PURE__ */ new WeakMap();
/** @internal */
const record = (registry, error, atom) => {
	if (!Predicate.isObject(error)) return;
	let byError = failedReads.get(registry);
	if (byError === void 0) {
		byError = /* @__PURE__ */ new WeakMap();
		failedReads.set(registry, byError);
	}
	byError.set(error, atom);
};
/** The atom whose read in `registry` threw `error`. @internal */
const get = (registry, error) => Predicate.isObject(error) ? failedReads.get(registry)?.get(error) : void 0;
export { get, record };
