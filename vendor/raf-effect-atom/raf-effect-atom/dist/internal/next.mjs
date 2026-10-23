import { dehydrate } from "../Hydration.mjs";
import { make as make$1, settled } from "../RequestRegistry.mjs";
import { make as make$2 } from "../Loader.mjs";
import * as React from "react";
// src/internal/next.ts
const renderSignal = () => {
	return React.cacheSignal();
};
const make = (options) => {
	const getRegistry = React.cache(() => {
		const registry = make$1(options);
		renderSignal()?.addEventListener("abort", () => registry.dispose(), { once: true });
		return registry;
	});
	const getLoader = React.cache(() => make$2(getRegistry(), { signal: renderSignal() ?? void 0 }));
	return {
		dehydrate: async () => {
			const registry = getRegistry();
			await settled(registry);
			return dehydrate(registry);
		},
		ensure: (source, ...args) => getLoader().ensure(source, ...args),
		fetch: (source, ...args) => getLoader().fetch(source, ...args),
		getRegistry,
		prefetch: (source, ...args) => getLoader().prefetch(source, ...args),
		run: (effect, runOptions) => getLoader().run(effect, runOptions)
	};
};
export { make };
