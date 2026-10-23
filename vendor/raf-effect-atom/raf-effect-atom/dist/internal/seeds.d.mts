import * as AtomRegistry from "effect/reactivity/AtomRegistry";
/** Prepares a request registry before any loader verb starts an atom in it. */
export type Seed = (registry: AtomRegistry.AtomRegistry) => void | Promise<void>;