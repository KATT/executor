import * as Effect from "effect/Effect";
import * as Config from "effect/Config";
// src/internal/development.ts
/** Whether `NODE_ENV` isn't `production`, read through `Config`. */
const isDevelopment = Config.String("NODE_ENV").pipe(Config.withDefault("development"), Effect.map((env) => env !== "production"), Effect.orElseSucceed(() => true));
export { isDevelopment };
