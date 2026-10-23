import { record } from "./failedReads.mjs";
import * as Option from "effect/Option";
import * as Cause from "effect/Cause";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
// src/internal/wrap.ts
/**
* Returns a `wrap` for the errors `owns` claims, memoized per atom and per
* family so a component reads the same derived atom on every render.
*
* @internal
*/
const make = (owns) => {
	const wrapped = /* @__PURE__ */ new WeakMap();
	const families = /* @__PURE__ */ new WeakMap();
	const wrapAtom = (source) => {
		const cached = wrapped.get(source);
		if (cached !== void 0) return cached;
		const atom = Atom.transform(source, (get) => {
			const result = get(source);
			if (!AsyncResult.isFailure(result)) return result;
			const error = Cause.findErrorOption(result.cause);
			if (Option.isNone(error) || !owns(error.value)) return result;
			record(get.registry, error.value, source);
			return AsyncResult.failure(Cause.die(error.value), {
				previousSuccess: result.previousSuccess,
				waiting: result.waiting
			});
		});
		const pointed = Object.assign(atom, { initialValueTarget: source });
		wrapped.set(source, pointed);
		return pointed;
	};
	const wrapFamily = (family) => {
		const cached = families.get(family);
		if (cached !== void 0) return cached;
		const made = (...args) => wrapAtom(family(...args));
		families.set(family, made);
		return made;
	};
	return ((source) => Atom.isAtom(source) ? wrapAtom(source) : wrapFamily(source));
};
export { make };
