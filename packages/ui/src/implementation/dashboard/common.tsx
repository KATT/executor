import { HugeiconsIcon } from "@hugeicons/react";
import { PackageIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { useOptionalDashboard, useDashboard } from "./context.tsx";
import { Suspense, useState, useSyncExternalStore, type ReactNode } from "react";
import { useAtomResult } from "raf-effect-atom";
import {
  appIconSources,
  catalogIconSources,
  catalogIconsFrom,
  faviconUrl,
  noCatalogIcons,
  type AppIconSources,
  type CatalogIcons,
} from "../../contracts/icons.ts";
import { providerDisplayUrl } from "../../contracts/dashboard.ts";
import type { App, ProviderDefinition } from "@executor-js/sdk";
import type { CatalogIcon } from "@executor-js/catalog/contracts";
import { Input } from "@executor-js/ui/components/input";
import { cn } from "@executor-js/ui/lib/utils";
import { Skeleton } from "../components/skeleton.tsx";

/** The dashboard's catalog icons. Suspends until the browser read settles. */
const useCatalogIcons = (): CatalogIcons => {
  const dashboard = useDashboard();
  return catalogIconsFrom(useAtomResult(dashboard.catalog, dashboard.catalogHandle));
};

/**
 * Catalog icons are started in the browser. Hydration draws the skeleton the server rendered;
 * the catalog read begins on the following paint, when a browser-only handle can resolve.
 */
export function AfterMount({
  fallback,
  children,
}: {
  readonly fallback: ReactNode;
  readonly children: ReactNode;
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return mounted ? children : fallback;
}

const iconFrameClass = (large: boolean) =>
  cn(
    "provider-icon w-8.5 h-8.5 border border-border rounded-[7px] inline-flex items-center justify-center bg-background shrink-0 [&_img]:w-4.25 [&_img]:h-4.25 [&_img]:object-contain [&_>_svg]:w-4.25 [&_>_svg]:h-4.25 [&_>_svg]:object-contain max-[740px]:[.catalog-row_>_&]:row-[1_/_3]",
    large &&
      "provider-icon-large w-11 h-11 rounded-[9px] [&_img]:w-6 [&_img]:h-6 [&_>_svg]:w-6 [&_>_svg]:h-6",
  );

function IconFrame({
  large = false,
  children,
}: {
  readonly large?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <span className={iconFrameClass(large)} aria-hidden>
      {children}
    </span>
  );
}

function IconSkeleton({ large = false }: { readonly large?: boolean }) {
  return (
    <IconFrame large={large}>
      <Skeleton className="size-full rounded-[inherit]" data-icon="loading" />
    </IconFrame>
  );
}

/**
 * An app's own icons: those it declares on `defineApp`, else those of the catalog entry it was
 * installed from, matched by package. `pending` while that catalog entry may still arrive.
 */
function appSources(app: App | undefined, catalog: CatalogIcons): AppIconSources | null {
  if (app === undefined) return null;
  const declared = appIconSources(app.requirements.icons);
  if (declared !== null) return declared;
  const origin = app.copiedFrom?.name;
  return origin === undefined ? null : catalogIconSources(catalog.byPackage.get(origin));
}

/**
 * An app's own icons when given or known to the catalog by name, otherwise the old product's
 * domain-derived logo, with a neutral fallback on image failure. While an own icon may still
 * arrive, the tile shows the loading skeleton instead of a domain logo that would then be replaced.
 */
interface ProviderIconProps {
  readonly name: string;
  readonly url?: string | null | undefined;
  readonly icons?: readonly CatalogIcon[] | undefined;
  readonly large?: boolean;
  /** An app's own icon, shown before the domain logo. */
  readonly declared?: AppIconSources | null;
  /** The app's own icon is still loading. */
  readonly pending?: boolean;
}

export function ProviderIcon(props: ProviderIconProps) {
  const dashboard = useOptionalDashboard();
  if (dashboard === null) return <ProviderIconView {...props} catalog={noCatalogIcons} />;
  // A declared icon does not come from the catalog. The catalog read still starts, so other icons
  // on the page can use it, and the fallback keeps the declared icon visible while that read waits.
  const ready =
    props.declared != null ? <ProviderIconView {...props} catalog={noCatalogIcons} /> : null;
  const skeleton = <IconSkeleton large={props.large ?? false} />;
  const fallback = ready ?? skeleton;
  return (
    <AfterMount fallback={fallback}>
      <Suspense fallback={fallback}>
        <ProviderIconCatalog {...props} />
      </Suspense>
    </AfterMount>
  );
}

function ProviderIconCatalog(props: ProviderIconProps) {
  return <ProviderIconView {...props} catalog={useCatalogIcons()} />;
}

function ProviderIconView({
  name,
  url,
  icons,
  large = false,
  declared = null,
  pending = false,
  catalog: catalogIcons,
}: ProviderIconProps & { readonly catalog: CatalogIcons }) {
  const [failed, setFailed] = useState<readonly string[]>([]);
  const normalized = name.toLowerCase().trim();
  const size = large ? 24 : 17;
  const catalog = icons ?? catalogIcons.byName.get(normalized) ?? undefined;
  const domain = url ?? (/^[a-z\d-]+(?:\.[a-z\d-]+)+$/i.test(normalized) ? normalized : null);
  const source = normalized === "executor" ? "/favicon.png" : faviconUrl(domain, size);
  const sources = declared ?? catalogIconSources(catalog);
  const waiting = sources === null && (pending || (icons === undefined && !catalogIcons.settled));
  const own = sources !== null && !failed.includes(sources.light) ? sources : null;
  const icon =
    own === null && !waiting && source !== null && !failed.includes(source) ? source : null;
  const fail = (key: string) => () =>
    setFailed((current) => (current.includes(key) ? current : [...current, key]));
  return (
    <IconFrame large={large}>
      {own ? (
        // The browser picks the variant for the color scheme, so the server renders the same
        // markup. A srcset ends a URL at whitespace, which a data URI may hold escaped.
        <picture className="contents">
          {own.dark !== own.light && (
            <source
              media="(prefers-color-scheme: dark)"
              srcSet={own.dark.replace(/\s/gu, encodeURIComponent)}
            />
          )}
          <img
            src={own.light}
            alt=""
            width={size}
            height={size}
            referrerPolicy="no-referrer"
            data-icon="app"
            onError={fail(own.light)}
          />
        </picture>
      ) : icon ? (
        <img
          src={icon}
          alt=""
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={fail(icon)}
        />
      ) : waiting ? (
        <Skeleton className="size-full rounded-[inherit]" data-icon="loading" />
      ) : (
        <HugeiconsIcon icon={PackageIcon} aria-hidden size={large ? 23 : 17} strokeWidth={1.5} />
      )}
    </IconFrame>
  );
}

/**
 * The app's own icon (see `useAppIconSources`), or its first provider's logo when it has none.
 */
export function AppIcon({
  app,
  name,
  large = false,
}: {
  readonly app: App | undefined;
  /** Shown for the fallback when the app is unavailable. */
  readonly name?: string;
  readonly large?: boolean;
}) {
  const dashboard = useOptionalDashboard();
  const declared = app === undefined ? null : appIconSources(app.requirements.icons);
  if (declared !== null)
    return <AppIconView app={app} name={name} large={large} sources={declared} />;
  if (dashboard === null)
    return (
      <AppIconView app={app} name={name} large={large} sources={appSources(app, noCatalogIcons)} />
    );
  const skeleton = <IconSkeleton large={large} />;
  return (
    <AfterMount fallback={skeleton}>
      <Suspense fallback={skeleton}>
        <AppIconCatalog app={app} name={name} large={large} />
      </Suspense>
    </AfterMount>
  );
}

function AppIconCatalog(props: {
  readonly app: App | undefined;
  readonly name?: string | undefined;
  readonly large: boolean;
}) {
  return <AppIconView {...props} sources={appSources(props.app, useCatalogIcons())} />;
}

function AppIconView({
  app,
  name,
  large,
  sources,
}: {
  readonly app: App | undefined;
  readonly name?: string | undefined;
  readonly large: boolean;
  readonly sources: AppIconSources | null;
}) {
  const provider = app && Object.values(app.requirements.accounts)[0]?.definition;
  return (
    <ProviderIcon
      name={provider?.name ?? app?.name ?? name ?? "App"}
      url={providerDisplayUrl(provider)}
      large={large}
      declared={sources}
    />
  );
}

/**
 * A provider row inside an app. An app with one provider is that provider's product, so the row
 * shows the app's own icon; an app combining several providers shows each one's logo.
 */
export function AppProviderIcon({
  app,
  provider,
  large = false,
}: {
  readonly app: App;
  readonly provider: ProviderDefinition;
  readonly large?: boolean;
}) {
  const dashboard = useOptionalDashboard();
  const declared = appIconSources(app.requirements.icons);
  if (declared !== null)
    return <AppProviderIconView app={app} provider={provider} large={large} sources={declared} />;
  if (dashboard === null)
    return (
      <AppProviderIconView
        app={app}
        provider={provider}
        large={large}
        sources={appSources(app, noCatalogIcons)}
      />
    );
  const skeleton = <IconSkeleton large={large} />;
  return (
    <AfterMount fallback={skeleton}>
      <Suspense fallback={skeleton}>
        <AppProviderIconCatalog app={app} provider={provider} large={large} />
      </Suspense>
    </AfterMount>
  );
}

function AppProviderIconCatalog({
  app,
  provider,
  large,
}: {
  readonly app: App;
  readonly provider: ProviderDefinition;
  readonly large: boolean;
}) {
  return (
    <AppProviderIconView
      app={app}
      provider={provider}
      large={large}
      sources={appSources(app, useCatalogIcons())}
    />
  );
}

function AppProviderIconView({
  app,
  provider,
  large,
  sources,
}: {
  readonly app: App;
  readonly provider: ProviderDefinition;
  readonly large: boolean;
  readonly sources: AppIconSources | null;
}) {
  const single =
    new Set(Object.values(app.requirements.accounts).map((slot) => slot.definition.name)).size ===
    1;
  return (
    <ProviderIcon
      name={provider.name}
      url={providerDisplayUrl(provider)}
      large={large}
      {...(single ? { declared: sources } : {})}
    />
  );
}

/** A search field with a consistent accessible label and width. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  autoFocus = false,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly autoFocus?: boolean;
}) {
  return (
    <div className="search-input min-w-0 relative w-[min(100%,_340px)] [&_>_svg]:absolute [&_>_svg]:left-2.75 [&_>_svg]:top-2.5 [&_>_svg]:text-muted-foreground [&_>_svg]:pointer-events-none [&_input]:pl-8.5 [&_input]:shadow-none [&_input]:h-8.75 [&_input]:text-[13px] [.apps-toolbar_&]:w-full max-[740px]:[&_input]:text-[16px] max-[740px]:w-full max-[740px]:[&_>_svg]:top-3.75 max-[740px]:[.tool-toolbar_&]:col-[1_/_-1]">
      <HugeiconsIcon icon={Search01Icon} strokeWidth={2} size={15} aria-hidden />
      <Input
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}

export { LoadingRows } from "./context.tsx";

export { EmptyState as Empty } from "./empty-state.tsx";

/** Small section title, aligned with an optional trailing control. */
export function SectionHeading({
  children,
  action,
}: {
  readonly children: ReactNode;
  readonly action?: ReactNode;
}) {
  return (
    <div className="section-heading flex items-center justify-between [margin:24px_0_13px] [&_h2]:text-[13px] [&_h2]:font-medium [.section-toolbar_&]:m-0">
      <h2>{children}</h2>
      {action}
    </div>
  );
}
