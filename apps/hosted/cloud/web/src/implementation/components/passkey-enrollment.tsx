import { LoginFrame } from "@executor-js/hosted-web/pages/login-frame";
import { RegistryContext, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Button } from "@executor-js/ui/components/button";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { Suspense, useContext, useState, type ReactNode } from "react";
import { Loader, useAtomResult, type Handle } from "raf-effect-atom";
import { addPasskeyAtom } from "../../contracts/auth.ts";
import {
  dismissPasskeyEnrollmentAtom,
  documentPasskeyEnrollmentAtom,
  hasPasskeyEnrollment,
  passkeyEnrollmentAtom,
} from "../../contracts/passkey-enrollment.ts";

/** Optional enrollment after sign-in. Dashboard routes never mount or query this flow. */
export function PasskeyEnrollment({
  userId,
  enrollment,
  children,
  canSubmit = true,
}: {
  readonly userId: string;
  readonly enrollment?: Handle<typeof passkeyEnrollmentAtom> | undefined;
  readonly children: ReactNode;
  readonly canSubmit?: boolean;
}) {
  const fromDocument = useAtomValue(documentPasskeyEnrollmentAtom(userId));
  if (!Option.getOrElse(fromDocument, () => hasPasskeyEnrollment(userId))) return children;
  return (
    <Enrollment key={userId} userId={userId} enrollment={enrollment} canSubmit={canSubmit}>
      {children}
    </Enrollment>
  );
}

function Enrollment({
  userId,
  enrollment,
  children,
  canSubmit,
}: {
  readonly userId: string;
  readonly enrollment: Handle<typeof passkeyEnrollmentAtom> | undefined;
  readonly children: ReactNode;
  readonly canSubmit: boolean;
}) {
  if (enrollment === undefined)
    return (
      <BrowserEnrollment userId={userId} canSubmit={canSubmit}>
        {children}
      </BrowserEnrollment>
    );
  return (
    <Suspense fallback={<PasskeyEnrollmentPending />}>
      <EnrollmentRead userId={userId} enrollment={enrollment} canSubmit={canSubmit}>
        {children}
      </EnrollmentRead>
    </Suspense>
  );
}

function BrowserEnrollment({
  userId,
  children,
  canSubmit,
}: {
  readonly userId: string;
  readonly children: ReactNode;
  readonly canSubmit: boolean;
}) {
  const registry = useContext(RegistryContext);
  const enrollment = Loader.make(registry).prefetchInBrowser(passkeyEnrollmentAtom, userId);
  return (
    <Suspense fallback={<PasskeyEnrollmentPending />}>
      <EnrollmentRead userId={userId} enrollment={enrollment} canSubmit={canSubmit}>
        {children}
      </EnrollmentRead>
    </Suspense>
  );
}

function PasskeyEnrollmentPending() {
  return (
    <LoginFrame title="Create a passkey">
      <p className="text-sm text-muted-foreground">Checking your passkeys…</p>
    </LoginFrame>
  );
}

function EnrollmentRead({
  userId,
  enrollment: enrollmentHandle,
  children,
  canSubmit,
}: {
  readonly userId: string;
  readonly enrollment: Handle<typeof passkeyEnrollmentAtom>;
  readonly children: ReactNode;
  readonly canSubmit: boolean;
}) {
  const enrollment = useAtomResult(passkeyEnrollmentAtom, enrollmentHandle);
  const add = useAtomSet(addPasskeyAtom, { mode: "promiseExit" });
  const dismiss = useAtomSet(dismissPasskeyEnrollmentAtom, { mode: "promiseExit" });
  const adding = useAtomValue(addPasskeyAtom);
  const [error, setError] = useState<string | null>(null);
  if (AsyncResult.isSuccess(enrollment) && !enrollment.value) return children;
  return (
    <LoginFrame title="Create a passkey">
      <div className="space-y-6 [&>button]:w-full">
        <p className="text-sm text-muted-foreground">
          Sign in faster with your fingerprint, face, or password manager.
        </p>
        <Button
          className="h-10 text-base aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          aria-label="Create a passkey"
          loading={adding.waiting}
          aria-disabled={!canSubmit || AsyncResult.isFailure(enrollment) || undefined}
          onClick={async () => {
            if (!canSubmit || AsyncResult.isFailure(enrollment)) return;
            setError(null);
            const result = await add("Passkey");
            if (Exit.isFailure(result))
              setError("Passkey was not added. Try again or choose Not now to continue.");
            else await dismiss(userId);
          }}
        >
          Create a passkey
        </Button>
        <Button
          data-product-area="auth"
          data-product-action="skip_passkey"
          variant="ghost"
          disabled={adding.waiting}
          onClick={() => dismiss(userId)}
        >
          Not now
        </Button>
        {AsyncResult.isFailure(enrollment) && (
          <p className="auth-error text-destructive text-[13px]" role="alert">
            Unable to check your passkeys. Choose Not now to continue.
          </p>
        )}
        {error && (
          <p className="auth-error text-destructive text-[13px]" role="alert">
            {error}
          </p>
        )}
      </div>
    </LoginFrame>
  );
}
