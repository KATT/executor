import { TagsOf, UseErrorBoundary, Variance } from "./claim.mjs";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as React from "react";
import * as Atom from "effect/reactivity/Atom";
import { HttpApiEndpoint, HttpApiGroup, HttpApiMiddleware } from "effect/http-api";
import * as AtomHttpApi from "effect/reactivity/AtomHttpApi";
import * as AtomRpc from "effect/reactivity/AtomRpc";
import * as Schema from "effect/Schema";
/**
 * Props for a `catchTags` handler: the caught error, and `reset`.
 *
 * @stability unstable
 * @category models
 * @since 0.1.0
 */
export interface CatchTagProps<E> {
  readonly error: E;
  /**
   * Refreshes what failed and renders the children again: an
   * `AtomErrorBoundary`'s atom, or every atom in the registry whose failure a
   * `createErrorBoundary` boundary has a handler for.
   */
  readonly reset: () => void;
}
/**
 * One optional handler per `_tag` of `E` (or per tag in `Tags`), each typed by
 * the error with that tag. A handler renders as a component, so it can call
 * hooks.
 *
 * @stability unstable
 * @category models
 * @since 0.1.0
 */
export type CatchTags<E, Tags extends TagsOf<E> = TagsOf<E>> = { readonly [Tag in Tags]?: (props: CatchTagProps<Extract<E, {
  readonly _tag: Tag;
}>>) => React.ReactNode; };
/**
 * The errors an `AtomHttpApi` query of each endpoint fails with: the
 * endpoint's errors and its middleware's.
 */
type EndpointErrors<Endpoint> = Endpoint extends HttpApiEndpoint.HttpApiEndpoint<infer _Identifier, infer _Method, infer _Path, infer _Params, infer _Query, infer _Payload, infer _Headers, infer _Success, infer Error extends Schema.Top, infer Middleware, infer _MiddlewareServices> ? Error["Type"] | HttpApiMiddleware.Error<Middleware> | HttpApiMiddleware.ClientError<Middleware> : never;
/**
 * The error type of what a boundary's `errors` names: an `AtomRpc` client
 * (the errors of every procedure), an `AtomHttpApi` client (the errors of
 * every endpoint and its middleware), an atom, or an atom family.
 *
 * @stability unstable
 * @category utility types
 * @since 0.1.0
 */
export type ErrorsOf<Source> = Source extends AtomRpc.AtomRpcClient<infer _Self, infer _Id, infer _Rpcs> ? Source["query"] extends ((...args: ReadonlyArray<never>) => infer Query) ? Query extends Atom.Atom<AsyncResult.AsyncResult<infer _A, infer E>> ? E : never : never : Source extends AtomHttpApi.AtomHttpApiClient<infer _Self, infer _Id, infer Groups> ? EndpointErrors<HttpApiGroup.Endpoints<Groups>> : Source extends Atom.Atom<AsyncResult.AsyncResult<infer _A, infer E>> ? E : Source extends ((...args: ReadonlyArray<never>) => Atom.Atom<AsyncResult.AsyncResult<infer _A, infer E>>) ? E : never;
/**
 * Props for an error boundary that catches one atom's failures by `_tag`.
 *
 * @stability unstable
 * @category components
 * @since 0.1.0
 */
export interface AtomErrorBoundaryProps<A, E> {
  /** The atom whose failures this boundary catches. */
  readonly atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>;
  /** A handler per `_tag` of the atom's error. */
  readonly catchTags: NoInfer<CatchTags<E>>;
  readonly children?: React.ReactNode | undefined;
}
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
export declare const AtomErrorBoundary: <A, E>(props: AtomErrorBoundaryProps<A, E>) => React.ReactNode;
/**
 * A boundary component: renders the `catchTags` handler for the errors it
 * claims and throws the rest to the boundaries above it.
 *
 * @stability unstable
 * @category components
 * @since 0.1.0
 */
export interface ErrorBoundaryComponent<Tags extends string> extends Variance<Tags> {
  (props: {
    readonly children?: React.ReactNode | undefined;
  }): React.ReactNode;
  readonly displayName: string;
}
/**
 * A boundary component and its hook, which narrows the results read under
 * it, named freely by destructuring.
 *
 * @stability unstable
 * @category models
 * @since 0.1.0
 */
export type ErrorBoundary<Tags extends string> = readonly [Boundary: ErrorBoundaryComponent<Tags>, useBoundary: UseErrorBoundary<Tags>];
/**
 * Options for `createErrorBoundary`.
 *
 * @stability unstable
 * @category models
 * @since 0.1.0
 */
export interface ErrorBoundaryOptions<Source, Tags extends TagsOf<ErrorsOf<Source>>, ParentTags extends string> {
  /** A handler per `_tag` this boundary claims. */
  readonly catchTags: CatchTags<ErrorsOf<Source>, Tags>;
  /**
   * What the handlers' errors come from, for the types: an `AtomRpc` or
   * `AtomHttpApi` client, an atom, or an atom family.
   */
  readonly errors: Source;
  /** Names it in messages and React DevTools: `"Auth"` is `<AuthBoundary>`. */
  readonly name: string;
  /** The boundary it sits under, which must be mounted above it. */
  readonly parent?: ErrorBoundaryComponent<ParentTags> | undefined;
}
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
export declare const createErrorBoundary: <Source, Tags extends TagsOf<ErrorsOf<Source>>, ParentTags extends string = never>(options: ErrorBoundaryOptions<Source, Tags, ParentTags>) => ErrorBoundary<Tags | ParentTags>;
export {};