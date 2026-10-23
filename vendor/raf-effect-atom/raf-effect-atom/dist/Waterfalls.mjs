"use client";
import { get } from "./internal/pending.mjs";
import { hydrated } from "./Hydration.mjs";
import { keyOf } from "./internal/leases.mjs";
import { atomOf, make, sourceOf } from "./internal/handles.mjs";
import { prefetch } from "./Loader.mjs";
import { ModeContext, isStarted } from "./internal/waterfalls.mjs";
import * as Predicate from "effect/Predicate";
import * as Effect from "effect/Effect";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { RegistryContext } from "@effect/atom-react";
import * as React from "react";
import { jsx } from "react/jsx-runtime";
// src/Waterfalls.tsx
/**
* Request waterfalls: the escape hatch for atoms only a render can start,
* and the development check that finds the others.
*
* @stability unstable
* @since 0.1.0
*/
/**
* Sets how `useAtomResult` reports request waterfalls in the tree below.
*
* **When to use**
*
* Put it in the root layout, around the app. `"throw"` turns every atom a
* component starts on its own into an error in development, which a person
* or a coding agent can't miss.
*
* **Details**
*
* Production builds don't check: the check sits behind
* `process.env.NODE_ENV !== "production"`, which bundlers replace at build
* time, so it's left out of the bundle, and this component renders only its
* children.
*
* **Example**
*
* ```tsx
* import { WaterfallDetection } from "raf-effect-atom"
*
* function App(props: { readonly children: React.ReactNode }) {
*   return <WaterfallDetection mode="throw">{props.children}</WaterfallDetection>
* }
* ```
*
* @stability unstable
* @category components
* @since 0.1.0
*/
const WaterfallDetection = (props) => process.env.NODE_ENV === "production" ? props.children : /* @__PURE__ */ jsx(ModeContext, {
	value: props.mode,
	children: props.children
});
/**
* Starts a source's atom during render and returns its handle, for an input
* only a render knows, such as a debounced search query.
*
* **When to use**
*
* As an escape hatch, when no loader, server component or event handler can
* start the atom: each call is a request waterfall, a round trip after the
* render that found the input. Prefer putting the state that picks the data
* in the URL, where a loader reads it, or a procedure that resolves the input
* on the server. Searching a codebase for `useWaterfall` lists its
* waterfalls.
*
* **Details**
*
* - Starts the atom like `Loader.prefetch`, with a lease that
*   `useAtomResult` takes over when the component mounts, and only if
*   nothing started it yet: re-renders start nothing.
* - A result the server is still streaming is awaited by `useAtomResult`,
*   not started again.
* - `useAtomResult` doesn't report an atom started this way.
* - The handle is a prefetched one: its reader suspends until the result
*   settles, as for a handle from a loader's `prefetch`.
* - A derived source, such as an error boundary's `wrap(source)`, starts
*   the serializable atom its `initialValueTarget` chain points at, as
*   `Loader.prefetch` does.
*
* **Example**
*
* ```tsx
* import { useAtomResult, useWaterfall } from "raf-effect-atom"
*
* function Author(props: { readonly userId: UserId }) {
*   const result = useAtomResult(user, useWaterfall(user, props.userId))
*   // ...
* }
* ```
*
* @see {@link WaterfallDetection} for the development check it opts out of
*
* @stability unstable
* @category hooks
* @since 0.1.0
*/
const useWaterfall = (source, ...args) => {
	const registry = React.useContext(RegistryContext);
	const atom = atomOf(source, args);
	const target = hydrated(sourceOf(atom));
	const key = keyOf(target);
	if (!(Predicate.isString(key) && get(registry, key) !== void 0) && !isStarted(registry, target)) return Effect.runSync(Effect.provideService(prefetch(source, ...args), AtomRegistry.AtomRegistry, registry));
	return make(args, atom);
};
export { WaterfallDetection, useWaterfall };
