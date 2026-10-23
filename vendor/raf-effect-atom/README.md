# Vendored raf-effect-atom

Executor consumes `raf-effect-atom` and `effect-atom-boundary` from this folder. The packages are not on npm. Each workspace package is the built `dist` from a `pnpm pack` tarball committed next to it:

- `raf-effect-atom-0.2.1.tgz`
- `effect-atom-boundary-0.1.1.tgz`

The workspace `package.json` files are written here, not taken from the tarball. They depend on executor's exact `effect`, `@effect/atom-react`, and `react` versions. Only the root export is exposed, so the TanStack Router, React Router, and Next entry points are not installed.

## Refresh

From a checkout of [KATT/raf-effect-atom](https://github.com/KATT/raf-effect-atom), using the Node version in that repo's `.nvmrc`:

```sh
nvm use
pnpm install
pnpm --filter raf-effect-atom --filter effect-atom-boundary build
pnpm --filter raf-effect-atom pack --pack-destination /tmp/raf-packs
pnpm --filter effect-atom-boundary pack --pack-destination /tmp/raf-packs
```

Replace the tarballs in this folder, delete each package's `dist`, and extract the new `dist` from the tarball (`tar -xzf … package/dist`). Keep the workspace `package.json` exports and dependency versions aligned with executor. Then run `bun install` at the executor root so the lockfile records the workspace packages.
