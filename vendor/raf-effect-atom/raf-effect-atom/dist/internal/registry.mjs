import { isDevelopment } from "./development.mjs";
import { isRequestRegistry, make as make$1 } from "../RequestRegistry.mjs";
import * as Effect from "effect/Effect";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { scheduleTask } from "@effect/atom-react";
// src/internal/registry.ts
const isServer = () => !("window" in globalThis);
/**
* In development, throws when `rendered` renders on the server without a
* request registry: in one every request shares, such as
* `@effect/atom-react`'s default `RegistryContext`.
*/
const requireRequestRegistry = (registry, rendered) => {
	if (isServer() && !isRequestRegistry(registry) && Effect.runSync(isDevelopment)) throw new Error(`raf-effect-atom: ${rendered} rendered on the server without a request registry, so results would be shared between requests. Provide RequestRegistry.make() through RegistryContext, as the framework integrations do.`);
};
/** `@effect/atom-react`'s default registry keeps an unused atom this long. */
const defaultIdleTTL = 400;
/**
* A request registry on the server, and in the browser a registry like
* `@effect/atom-react`'s `RegistryProvider` makes.
*/
const make = (options) => isServer() ? make$1({
	initialValues: options?.initialValues,
	seed: options?.seed
}) : AtomRegistry.make({
	defaultIdleTTL: options?.defaultIdleTTL ?? defaultIdleTTL,
	initialValues: options?.initialValues,
	scheduleTask
});
let mounted;
/**
* Records the browser registry a `RegistryProvider` provides while it's
* mounted, for code outside React, such as React Router's client
* middleware. Returns the cleanup that forgets it.
*/
const mount = (registry) => {
	mounted = registry;
	return () => {
		if (mounted === registry) mounted = void 0;
	};
};
/** The browser registry of the mounted `RegistryProvider`, if one is. */
const current = () => mounted;
export { current, isServer, make, mount, requireRequestRegistry };
