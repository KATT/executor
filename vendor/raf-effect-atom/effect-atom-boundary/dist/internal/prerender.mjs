import { RegistryContext } from "@effect/atom-react";
import * as Cause from "effect/Cause";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as React from "react";
import * as Atom from "effect/reactivity/Atom";
import { jsx, jsxs } from "react/jsx-runtime";
// src/internal/prerender.tsx
/**
* The typed error of a settled failure, or `None` for anything else: a
* success, a result still loading or refreshing, or a defect.
*
* @internal
*/
const settledError = (value) => AsyncResult.isAsyncResult(value) && AsyncResult.isFailure(value) && !value.waiting ? Cause.findErrorOption(value.cause) : Option.none();
/**
* An atom's current value in the registry, without starting it: its node's
* value, or a hydrated value no read has decoded yet.
*
* @internal
*/
const peek = (registry, atom) => {
	const serializable = Atom.isSerializable(atom) ? atom[Atom.SerializableTypeId] : void 0;
	const node = registry.getNodes().get(serializable === void 0 ? atom : serializable.key);
	if (node !== void 0) return node.valueOption();
	if (serializable === void 0 || !registry.preloadedSerializable.has(serializable.key)) return Option.none();
	const encoded = registry.preloadedSerializable.get(serializable.key);
	try {
		return Option.some(serializable.decode(encoded));
	} catch {
		return Option.none();
	}
};
const never = new Promise(() => {});
const Never = () => React.use(never);
const subscribe = () => () => {};
const onClient = () => false;
const onServer = () => true;
const noReset = () => {};
/** Whether this render runs on the server: anywhere without a `window`. */
const isServer = () => !("window" in globalThis);
/**
* Renders a boundary's handler on the server in place of its children when
* `find` finds a failure the boundary catches, since React's server
* renderer runs no error boundaries: a read that throws there fails the
* response, or leaves the page to the browser.
*
* In the browser, hydration keeps that HTML: the children suspend inside
* the same `Suspense` without being compared with it. Once hydrated, the
* children render, the read throws, and the boundary catches it as it
* would in the browser, so the handler gets a `reset` that works.
*
* @internal
*/
const Prerendered = (props) => {
	const id = React.useId();
	const registry = React.useContext(RegistryContext);
	const hydrating = React.useSyncExternalStore(subscribe, onClient, onServer);
	const [rendered] = React.useState(() => hydrating && !isServer() && document.getElementById(id) !== null);
	if (isServer()) {
		const caught = props.find(registry);
		if (caught === void 0) return props.children;
		const error = caught.error;
		return /* @__PURE__ */ jsxs(React.Suspense, {
			fallback: null,
			children: [/* @__PURE__ */ jsx("template", { id }), /* @__PURE__ */ jsx(caught.Handler, {
				error,
				reset: noReset
			})]
		});
	}
	if (!rendered) return props.children;
	return /* @__PURE__ */ jsx(React.Suspense, {
		fallback: null,
		children: hydrating ? /* @__PURE__ */ jsx(Never, {}) : props.children
	});
};
export { Prerendered, peek, settledError };
