import * as React from "react";
/**
 * Provides the app's registry: a request registry while the framework
 * renders the app on the server, and one registry for the page's lifetime
 * in the browser.
 *
 * **When to use**
 *
 * Put it in the root layout, around `children`, in place of
 * `@effect/atom-react`'s `RegistryProvider`, which would share one registry
 * between requests' server renders.
 *
 * **Details**
 *
 * `defaultIdleTTL` is how many milliseconds the browser's registry keeps an
 * atom no component reads, 400 by default, as `@effect/atom-react`'s default
 * registry does. An atom's own `Atom.setIdleTTL` or `Atom.keepAlive` wins.
 * It's read once, when the registry is made. The server's request registry
 * lives for one request, so it has none.
 *
 * In the browser, React Router's `clientAtomsMiddleware` gives client
 * loaders the registry of the mounted provider.
 *
 * **Example**
 *
 * ```tsx
 * import { RegistryProvider } from "raf-effect-atom"
 *
 * export default function RootLayout(props: { children: React.ReactNode }) {
 *   return (
 *     <RegistryProvider defaultIdleTTL={60_000}>{props.children}</RegistryProvider>
 *   )
 * }
 * ```
 *
 * @stability unstable
 * @category components
 * @since 0.1.0
 */
export declare const RegistryProvider: (props: {
  readonly children?: React.ReactNode | undefined;
  readonly defaultIdleTTL?: number | undefined;
}) => React.ReactNode;