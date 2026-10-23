import { createFileRoute } from "@tanstack/react-router";
import { DevicePage, deviceSearch, loadDevice } from "@executor-js/hosted-web/pages/device";

/** RFC 8628 verification: approve a device's sign-in by its code. */
export const Route = createFileRoute("/device")({
  validateSearch: deviceSearch,
  loaderDeps: ({ search }) => ({ user_code: search.user_code }),
  loader: ({ context, deps }) => loadDevice(context.atoms, deps.user_code),
  component: DeviceRoute,
});

function DeviceRoute() {
  return <DevicePage {...Route.useSearch()} reads={Route.useLoaderData()} />;
}
