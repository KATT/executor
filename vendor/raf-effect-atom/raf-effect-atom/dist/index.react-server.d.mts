import { ArgsOf, ErrorOf, Handle, HandleKey, LoadedHandle, Source, SuccessOf } from "./Handle.mjs";
import { Loader_d_exports } from "./Loader.mjs";
import { RequestRegistry_d_exports } from "./RequestRegistry.mjs";
import { Hydration_d_exports } from "./Hydration.mjs";
import { useAtomResult } from "./Hooks.mjs";
import { HydrationBoundaryProps } from "./ReactHydration.mjs";
import { RegistryProvider } from "./RegistryProvider.mjs";
import { WaterfallDetection, WaterfallMode, useWaterfall } from "./Waterfalls.mjs";
import "./index.shared.mjs";
import { HydrationBoundary } from "./ReactHydration.react-server.mjs";
import type { Atom } from "effect/reactivity/Atom";
/** Ends the loader lease on `atom`, if one is held. See `useAtomResult`. */
export declare const releaseLease: (registry: {
  readonly mount: (atom: Atom.Atom<unknown>) => () => void;
}, atom: Atom.Atom<unknown>) => void;
export { ArgsOf, ErrorOf, Handle, HandleKey, Hydration_d_exports as Hydration, HydrationBoundary, type HydrationBoundaryProps, LoadedHandle, Loader_d_exports as Loader, RegistryProvider, RequestRegistry_d_exports as RequestRegistry, Source, SuccessOf, WaterfallDetection, WaterfallMode, useAtomResult, useWaterfall };