// src/internal/sources.ts
/** The registry each `dehydrate` result came from, while it's referenced. */
const sources = /* @__PURE__ */ new WeakMap();
const remember = (state, registry) => {
	sources.set(state, registry);
	return state;
};
/**
* The registry `state` was dehydrated from, when it's the same object
* `dehydrate` returned: during server rendering by a framework that passes
* loader data to components without serializing it, such as React Router.
*/
const sourceOf = (state) => state === void 0 ? void 0 : sources.get(state);
export { remember, sourceOf };
