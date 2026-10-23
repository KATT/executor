import { keyOf as keyOf$1 } from "./leases.mjs";
import * as Atom from "effect/reactivity/Atom";
import * as Predicate from "effect/Predicate";
// src/internal/handles.ts
/** The atom a source makes for its arguments. */
const atomOf = (source, args) => Atom.isAtom(source) ? source : source(...args);
/** The registry key a handle records: the atom's serialization key. */
const keyOf = (atom) => {
	const key = keyOf$1(atom);
	if (!Predicate.isString(key)) return;
	return key;
};
const make = (args, atom) => ({
	args,
	key: keyOf(atom)
});
const loaded = (args, atom) => ({
	args,
	key: keyOf(atom),
	loaded: true
});
export { atomOf, loaded, make };
