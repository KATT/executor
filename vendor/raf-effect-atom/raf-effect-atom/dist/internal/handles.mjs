import { keyOf as keyOf$1 } from "./leases.mjs";
import * as Atom from "effect/reactivity/Atom";
import * as Predicate from "effect/Predicate";
// src/internal/handles.ts
/** The atom a source makes for its arguments. */
const atomOf = (source, args) => Atom.isAtom(source) ? source : source(...args);
/**
* The atom the loader starts and the server sends for `atom`: the first
* serializable atom in its `initialValueTarget` chain, starting with `atom`.
* An AtomRpc query is serializable itself, though it points at an inner atom.
*/
const sourceOf = (atom) => {
	for (let target = atom; target !== void 0; target = target.initialValueTarget) if (Atom.isSerializable(target)) return target;
	return atom;
};
/** The registry key a handle records: its source atom's serialization key. */
const keyOf = (atom) => {
	const key = keyOf$1(sourceOf(atom));
	if (!Predicate.isString(key)) return;
	return key;
};
const make = (args, atom) => ({
	args,
	key: keyOf(atom)
});
const inBrowser = (args, atom) => ({
	args,
	inBrowser: true,
	key: keyOf(atom)
});
const loaded = (args, atom) => ({
	args,
	key: keyOf(atom),
	loaded: true
});
export { atomOf, inBrowser, loaded, make, sourceOf };
