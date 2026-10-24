# Vendored raf-effect-atom

Executor consumes `raf-effect-atom` and `effect-atom-boundary` from this folder. Each workspace package is the built `dist` from a pack tarball committed next to it:

- `raf-effect-atom-0.3.0.tgz` (the published npm package)
- `effect-atom-boundary-0.2.0.tgz` (the published npm package)

The workspace `package.json` files are written here, not taken from the tarball. `react` is executor's exact version. `effect` and `@effect/atom-react` stay the published peer ranges (`^4.0.6`); executor's overrides select the installed copies. Only the root export is exposed, so the TanStack Router, React Router, and RSC entry points are not installed.

## Refresh

From a checkout of [KATT/raf-effect-atom](https://github.com/KATT/raf-effect-atom), using the Node version in that repo's `.nvmrc`:

```sh
nvm use
pnpm install
pnpm --filter raf-effect-atom --filter effect-atom-boundary build
pnpm --filter raf-effect-atom pack --pack-destination /tmp/raf-packs
pnpm --filter effect-atom-boundary pack --pack-destination /tmp/raf-packs
```

Replace the tarballs in this folder, delete each package's `dist`, and extract the new `dist` from the tarball (`tar -xzf … package/dist`). Keep the workspace `package.json` exports. Keep the published peer ranges for `effect` and `@effect/atom-react`, and keep `react` at executor's exact version. Then run `bun install` at the executor root so the lockfile records the workspace packages.
