"use client";
import { TypeId } from "./claim.mjs";
import { Prerendered, peek, settledError } from "./internal/prerender.mjs";
import { node } from "./internal/refresh.mjs";
import { variance } from "./internal/variance.mjs";
import { RegistryContext } from "@effect/atom-react";
import * as Cause from "effect/Cause";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as React from "react";
import { jsx } from "react/jsx-runtime";
// src/error-boundary.tsx
/**
* Error boundaries typed by an atom's error. A boundary catches failures by
* `_tag`, with a handler per tag typed by the error with that tag, so UI code
* never imports an error class. `AtomErrorBoundary` guards one atom;
* `createErrorBoundary` makes a shared boundary whose hook narrows the atoms
* read under it.
*
* @stability unstable
* @since 0.1.0
*/
const handlerFor = (handlers, error) => {
	for (const [tag, handler] of Object.entries(handlers)) if (handler !== void 0 && Predicate.isTagged(error, tag)) return handler;
};
const caughtBy = (handlers, error) => {
	if (Option.isNone(error)) return;
	const Handler = handlerFor(handlers, error.value);
	return Handler === void 0 ? void 0 : {
		error: error.value,
		Handler
	};
};
/**
* Whether `error` is the typed error `atom` currently fails with in
* `registry`: the same object, since a read throws the error its atom's
* failure holds.
*/
const failsWith = (registry, atom, error) => Option.exists(peek(registry, atom), (value) => AsyncResult.isAsyncResult(value) && AsyncResult.isFailure(value) && Option.exists(Cause.findErrorOption(value.cause), (failure) => failure === error));
var Catcher = class extends React.Component {
	state = {
		caught: void 0,
		resetKey: this.props.own
	};
	static getDerivedStateFromError(error) {
		return { caught: { error } };
	}
	static getDerivedStateFromProps(props, state) {
		const resetKey = props.own;
		if (Object.is(resetKey, state.resetKey)) return null;
		return {
			caught: void 0,
			resetKey
		};
	}
	render() {
		const caught = this.state.caught;
		if (caught === void 0) return /* @__PURE__ */ jsx(Prerendered, {
			find: this.props.find,
			children: this.props.children
		});
		const error = caught.error;
		const own = this.props.own;
		const registry = this.props.registry;
		const Handler = own !== void 0 && !failsWith(registry, own, error) ? void 0 : handlerFor(this.props.handlers, error);
		if (Handler === void 0) throw error;
		return /* @__PURE__ */ jsx(Handler, {
			error,
			reset: () => {
				this.props.reset(registry);
				this.setState({ caught: void 0 });
			}
		});
	}
};
/**
* Provides an error boundary for one atom that renders a handler per `_tag`
* of the atom's error, typed by the error with that tag.
*
* **When to use**
*
* Use when a subtree reads one atom and some of its failures should render
* in place of the subtree, without the reading component handling them.
*
* **Details**
*
* The reads under it throw the atom's failures, as `useAtomSuspense` does
* without `includeFailure`. A failure whose tag has a handler renders that
* handler; its `reset` refreshes the atom and renders the children again. A
* new `atom` clears a caught failure.
*
* React runs no error boundaries on the server, so during server rendering
* it reads `atom` before its children, from the registry or its hydrated
* state, and renders the handler for a failure that has settled. The
* browser keeps that HTML while it hydrates, then renders the children,
* which throw the failure to it again.
*
* **Gotchas**
*
* A failure without a handler, or an error that isn't the one the atom fails
* with in the boundary's registry, such as one a read of another atom threw,
* goes to the error boundaries above. Read with `suspendOnWaiting: true`, so
* a read waits for the refresh `reset` starts instead of throwing the old
* failure again. `reset` refreshes the atom in the registry
* the boundary renders in, not in a `RegistryContext` provided under it. A
* handler renders as a component: one written inline mounts again, losing its
* state, each time the parent renders.
*
* **Example** (Catching a missing issue)
*
* ```tsx
* <AtomErrorBoundary
*   atom={issue(id)}
*   catchTags={{
*     IssueNotFound: ({ error, reset }) => <NotFound id={error.id} onRetry={reset} />
*   }}
* >
*   <IssuePage id={id} />
* </AtomErrorBoundary>
*
* function IssuePage(props: { readonly id: number }) {
*   const result = useAtomSuspense(issue(props.id), { suspendOnWaiting: true })
*   return <h1>{result.value.title}</h1>
* }
* ```
*
* @see {@link createErrorBoundary} for a shared boundary that narrows the reads under it
*
* @stability unstable
* @category components
* @since 0.1.0
*/
const AtomErrorBoundary = (props) => {
	const registry = React.useContext(RegistryContext);
	const handlers = props.catchTags;
	const atom = props.atom;
	return /* @__PURE__ */ jsx(Catcher, {
		find: (current) => caughtBy(handlers, Option.flatMap(peek(current, atom), settledError)),
		handlers,
		own: atom,
		registry,
		reset: (current) => {
			node(current, atom);
		},
		children: props.children
	});
};
const MountedBoundaries = React.createContext(void 0);
const internals = /* @__PURE__ */ new WeakMap();
const isMounted = (at, boundary) => {
	for (let mounted = at; mounted; mounted = mounted.parent) if (mounted.boundary === boundary) return true;
	return false;
};
/**
* Creates a shared error boundary that claims some errors by `_tag`, returned
* as `[Boundary, useBoundary]`.
*
* **When to use**
*
* Use for failures that belong to the app rather than to the component that
* read them, such as being signed out, so the components under the boundary
* only handle what's left.
*
* **Details**
*
* A component under it wraps its read in the hook:
* `useBoundary(useAtomResult(issue, handle))` throws the failures this
* boundary or one above it claims to the nearest boundary that claims them,
* and returns the result typed without them. `parent` is the boundary it
* sits under; the claimed tags add up along the chain. `catchTags`' keys are tags
* of `errors`' error type, so a misspelled tag is a type error and each
* handler's `error` is typed.
*
* A handler's `reset` refreshes every atom in the registry the boundary
* renders in whose settled failure has a tag this boundary handles, not only
* the one whose read threw:
* one outage fails every atom on the page, and an atom that fails after the
* handler replaced the children throws to no boundary.
*
* React runs no error boundaries on the server, so during server rendering
* it looks through the registry's atoms before rendering its children, and
* renders its handler for a settled failure it catches. It only sees atoms
* that already ran in that registry, such as the loaders' on TanStack
* Start, or under `raf-effect-atom`'s `HydrationBoundary` on React Router.
* A failure it doesn't see is thrown on the server and caught in the
* browser.
*
* **Gotchas**
*
* A boundary matches `_tag` only: a failure with a claimed tag from any atom
* under it is caught. During server rendering, that's any atom in the
* registry, read under it or not. The boundary throws without its `parent`
* mounted above it, and the hook throws outside its boundary. The hook needs
* a read that returns its failures, such as `raf-effect-atom`'s
* `useAtomResult`: `useAtomSuspense` without `includeFailure` throws every
* failure before the hook sees it.
*
* **Example** (A sign-in boundary)
*
* ```tsx
* const [AuthBoundary, useAuthBoundary] = createErrorBoundary({
*   name: "Auth",
*   errors: Issues,
*   catchTags: { Unauthorized: ({ reset }) => <SignIn onSignedIn={reset} /> }
* })
*
* function IssueTitle(props: { readonly issue: Handle<typeof issue> }) {
*   const result = useAuthBoundary(useAtomResult(issue, props.issue))
*   // AsyncResult<Issue, IssueNotFound | RpcClientError>
* }
* ```
*
* @see {@link AtomErrorBoundary} for a boundary that guards one atom
*
* @stability unstable
* @category constructors
* @since 0.1.0
*/
const createErrorBoundary = (options) => {
	const parent = options.parent ? internals.get(options.parent) : void 0;
	const handlers = options.catchTags;
	const owns = (error) => handlerFor(handlers, error) !== void 0 || (parent?.owns(error) ?? false);
	const boundary = {
		displayName: `${options.name}Boundary`,
		owns
	};
	const catches = (value) => caughtBy(handlers, Option.flatMap(value, settledError));
	const find = (registry) => {
		for (const node of registry.getNodes().values()) {
			const caught = catches(node.valueOption());
			if (caught !== void 0) return caught;
		}
	};
	const reset = (registry) => {
		for (const node of Array.from(registry.getNodes().values())) if (catches(node.valueOption()) !== void 0) registry.refresh(node.atom);
	};
	const Boundary = (props) => {
		const above = React.useContext(MountedBoundaries);
		const registry = React.useContext(RegistryContext);
		if (parent && !isMounted(above, parent)) throw new Error(`<${boundary.displayName}> needs <${parent.displayName}>, its parent, above it`);
		return /* @__PURE__ */ jsx(Catcher, {
			find,
			handlers,
			registry,
			reset,
			children: /* @__PURE__ */ jsx(MountedBoundaries, {
				value: {
					boundary,
					parent: above
				},
				children: props.children
			})
		});
	};
	const component = Object.assign(Boundary, {
		displayName: boundary.displayName,
		[TypeId]: variance
	});
	internals.set(component, boundary);
	const useBoundary = ((result) => {
		if (!isMounted(React.useContext(MountedBoundaries), boundary)) throw new Error(`The ${options.name} error boundary's hook found no <${boundary.displayName}> above it: wrap the tree in <${boundary.displayName}>`);
		if (AsyncResult.isFailure(result)) {
			const error = Cause.findErrorOption(result.cause);
			if (Option.isNone(error)) throw Cause.squash(result.cause);
			if (owns(error.value)) throw error.value;
		}
		return result;
	});
	return [component, useBoundary];
};
export { AtomErrorBoundary, createErrorBoundary };
