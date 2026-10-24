import { WorkflowStart, WorkflowTerminate } from "@executor-js/ui/dashboard/workflow-actions";
/** Thin product bindings for workflow and webhook views. */
import type {
  App,
  HostedWorkflow,
  WebhookSourceSummary,
  WebhookSubscription,
  WorkflowRunPage,
} from "@executor-js/sdk";
import type { StartedRead } from "@executor-js/ui/contracts/started-read";
import type { HostedError } from "../../contracts/errors.ts";
import { AppWorkflows } from "@executor-js/ui/dashboard/app-workflows";
import { AppWebhooks, WebhookSourceConfigurations } from "@executor-js/ui/dashboard/webhooks";
import { Button } from "@executor-js/ui/components/button";
import { workflowBindings, webhookBindings } from "../../contracts/resources.ts";
import { HostedFailure } from "../components/dashboard-bindings.tsx";
import { useOrganizationRoute } from "../components/organization.tsx";
/** Workflow definitions and starts use the app's linked accounts; run history is the app's. */
export function AppResources({
  app,
  view,
  definitions,
  runs,
  webhooks,
  webhookSources,
}: {
  readonly app: App;
  readonly view: "workflows" | "webhooks";
  readonly definitions?: StartedRead<readonly HostedWorkflow[], HostedError> | undefined;
  readonly runs?: StartedRead<WorkflowRunPage, HostedError> | undefined;
  readonly webhooks?: StartedRead<readonly WebhookSubscription[], HostedError> | undefined;
  readonly webhookSources?: StartedRead<readonly WebhookSourceSummary[], HostedError> | undefined;
}) {
  const { organization, slug } = useOrganizationRoute();
  if (view === "workflows") {
    const bindings = workflowBindings({
      organization,
      app: app.id,
      version: app.activeVersion ?? undefined,
    });
    return (
      <AppWorkflows
        key={String(app.activeVersion)}
        app={app}
        bindings={bindings}
        start={(definition, onStarted) => (
          <WorkflowStart
            key={definition.name}
            definition={definition}
            start={bindings.start(definition.name)}
            editable
            onStarted={onStarted}
            Failure={HostedFailure}
          />
        )}
        runAction={(run, workflow, cursor) => (
          <WorkflowTerminate
            run={run}
            terminate={bindings.terminate(run.id, workflow, cursor)}
            editable
            Failure={HostedFailure}
          />
        )}
        Failure={HostedFailure}
        {...(definitions === undefined ? {} : { definitionsRead: definitions })}
        {...(runs === undefined ? {} : { runsRead: runs })}
      />
    );
  }
  const hooks = webhookBindings({ organization, app: app.id });
  return (
    <AppWebhooks
      query={hooks.query}
      {...(webhooks === undefined ? {} : { read: webhooks })}
      retry={hooks.retry}
      Failure={HostedFailure}
      setupLink={(hook) => (
        <Button size="sm" variant="outline" asChild>
          <a href={`/org/${encodeURIComponent(slug)}/webhooks/${app.id}/${hook.id}`}>
            {hook.status === "disabled" ? "Finish removal" : "Complete setup"}
          </a>
        </Button>
      )}
    >
      <WebhookSourceConfigurations
        query={hooks.sources}
        {...(webhookSources === undefined ? {} : { read: webhookSources })}
        configure={hooks.configure}
        Failure={HostedFailure}
      />
    </AppWebhooks>
  );
}
