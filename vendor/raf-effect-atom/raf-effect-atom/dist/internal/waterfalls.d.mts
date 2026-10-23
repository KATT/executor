import "effect/reactivity/Atom";
import "effect/reactivity/AtomRegistry";
import "react";
/** What a development read does when it starts an atom nothing started. */
export type Mode = "off" | "throw" | "warn";