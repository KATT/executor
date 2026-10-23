import * as Atom from "effect/reactivity/Atom";
// src/internal/leases.ts
const leases = /* @__PURE__ */ new WeakMap();
/** The registry's key for an atom: its serialization key, or the atom. */
const keyOf = (atom) => Atom.isSerializable(atom) ? atom[Atom.SerializableTypeId].key : atom;
/**
* Mounts `atom` until `release`, or until `ttl` milliseconds pass. Taking a
* lease the atom already has restarts its timer.
*/
const take = (registry, atom, ttl) => {
	let byKey = leases.get(registry);
	if (byKey === void 0) {
		byKey = /* @__PURE__ */ new Map();
		leases.set(registry, byKey);
	}
	const key = keyOf(atom);
	let lease = byKey.get(key);
	if (lease === void 0) {
		const unmount = registry.mount(atom);
		const owner = byKey;
		const created = {
			release: () => {
				clearTimeout(created.timer);
				owner.delete(key);
				unmount();
			},
			timer: void 0
		};
		byKey.set(key, created);
		lease = created;
	}
	clearTimeout(lease.timer);
	lease.timer = ttl === void 0 ? void 0 : setTimeout(lease.release, ttl);
};
/** Releases `atom`'s lease, if it has one. */
const release = (registry, atom) => {
	leases.get(registry)?.get(keyOf(atom))?.release();
};
export { keyOf, release, take };
