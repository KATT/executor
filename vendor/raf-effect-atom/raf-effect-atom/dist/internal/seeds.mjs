import * as Predicate from "effect/Predicate";
// src/internal/seeds.ts
const seedings = /* @__PURE__ */ new WeakMap();
const waiting = (registry) => {
	const seeding = seedings.get(registry);
	return seeding === void 0 || seeding.resolved ? void 0 : seeding;
};
/**
* Runs `seed` on `registry`. Until a seed's promise settles, the verbs wait
* for it.
*/
const run = (registry, seed) => {
	const result = seed(registry);
	if (!Predicate.isPromiseLike(result)) return;
	const seeded = Promise.resolve(result);
	const seeding = {
		deferred: [],
		resolved: false,
		seeded
	};
	seeded.then(() => {
		seeding.resolved = true;
	}, () => void 0);
	seedings.set(registry, seeding);
};
/**
* The seed the verbs wait for: `undefined` once it has resolved, and the
* rejected promise once it has failed.
*/
const pending = (registry) => waiting(registry)?.seeded;
/**
* Runs `start` once the registry's seed has resolved: at once, unless it's
* still running. A seed that fails never runs it.
*/
const afterSeed = (registry, start) => {
	const seeding = waiting(registry);
	if (seeding === void 0) {
		start();
		return;
	}
	const started = seeding.seeded.then(start);
	started.catch(() => void 0);
	seeding.deferred.push(started);
};
/**
* Waits for the registry's seed and the starts that waited for it, so
* `Hydration.dehydrate` sees every atom the verbs started. Rejects with the
* seed's error, or with a start's defect.
*/
const settled = async (registry) => {
	const seeding = seedings.get(registry);
	if (seeding === void 0) return;
	await seeding.seeded;
	await Promise.all(seeding.deferred);
};
export { afterSeed, pending, run, settled };
