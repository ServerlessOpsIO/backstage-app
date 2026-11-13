# Common changes and tasks

## Set up a development environment

Install Node.js 24 (the exact version is in `src/package.json`), enable
Corepack so the pinned Yarn version is used, and install dependencies:

```sh
cd src
corepack enable
yarn install
```

Create `src/app-config.local.yaml`. It is git-ignored and loaded automatically.
It must at least:

- Set `auth.environment: local`. The sign-in page reads this key and offers
  guest sign-in next to Google only when it is `local`.
- Enable the `guest` auth provider, and configure the `google` and `github`
  providers under a `local` environment if you want real sign-in and the home
  page widgets.
- Provide values for everything the base file reads from the environment:
  `integrations.datadog`, the GitHub integration, and `techdocs.publisher`.
  Either set the variables (`DATADOG_SITE`, `DATADOG_API_KEY`,
  `DATADOG_APP_KEY`, `GITHUB_TOKEN`, `TECHDOCS_BUCKET`, `AWS_REGION`) or
  override the keys. The Datadog backend plugin fails at start-up without its
  three settings.

Then start the frontend on port 3000 and the backend on port 7007:

```sh
yarn start
```

Local development uses an in-memory SQLite database, so the catalog starts
empty and reloads the example entities in `src/examples/` on every start.

The base file points the `ServerlessOpsCatalog` topic at a local FIFO queue,
`http://localhost:9324/queue/serverlessops-catalog-events.fifo`. Run an
SQS-compatible emulator there to exercise event handling; without one the
consumer logs receive errors and everything else works. The ServerlessOps
catalog provider itself stays off until `catalog.providers.serverlessops-catalog`
is configured.

For the SAM template, install the AWS SAM CLI and run, from the repository
root:

```sh
sam validate --lint
sam build --parallel --template template.yaml
```

## Run the checks CI runs

From `src/`:

```sh
yarn tsc:full
yarn build:all
yarn test:all
yarn lint:all
```

While iterating, `yarn tsc`, `yarn test <path>`, and `yarn lint` (changes since
`origin/main`) are faster. Two suites are not in CI:

- `yarn test:config` checks the home page layout in `src/app-config.yaml`.
- `yarn test:e2e` runs Playwright. The test is the stock one and expects a
  guest **Enter** button, so it needs a local guest configuration.

## Add a frontend plugin or module

1. Create it with `yarn new` in `src/`, or add the package as a dependency of
   `src/packages/app`.
2. Plugins are discovered from the app's dependencies (`app.packages: all`).
   Local modules are also listed explicitly in the `features` array in
   `src/packages/app/src/App.tsx`; follow that pattern for modules.
3. Enable, disable, or configure its extensions under `app.extensions` in
   `src/app-config.yaml`.
4. If it adds a page, check where it lands in the sidebar:
   `src/plugins/app-module-nav/src/nav/SidebarOverride.tsx` places known pages
   explicitly and lists the rest alphabetically.

Use **Settings → Visualizer** to confirm the extension is installed and
attached where you expect.

## Add a backend plugin or module

1. Create it with `yarn new` in `src/`, or add the package as a dependency of
   `src/packages/backend`.
2. Add `backend.add(import('<package>'))` to
   `src/packages/backend/src/index.ts`. The backend discovers nothing
   automatically.
3. Add its configuration to `src/app-config.yaml`, with production values in
   `src/app-config.production.yaml`.
4. If it reads new environment variables, follow
   [Add an application setting](#add-an-application-setting).
5. If it calls AWS, add the permissions to `TaskIamRole` in `template.yaml`.

## Add a scaffolder action

Add the action to the matching module in `src/plugins/`, or create a new
`scaffolder-backend-module-*` and register it in the backend. Then:

- Export it from the module's `actions/index.ts` and pass it to
  `scaffolderActions.addActions(...)` in `module.ts`.
- Document its inputs, outputs, and failure behavior in the module's
  `README.md`, and add it to
  [Plugins and templates](02-plugins-and-templates.md#scaffolder-actions).
- If it runs a command-line tool, install the tool in `src/Dockerfile`.
- If it acts as the user on GitHub, read the token from the task secret named
  by `userCredentialsSecretKey`, as the existing actions do.

## Add or change a software template

**A template in another repository:** add a `type: url` entry to
`catalog.locations` in `src/app-config.production.yaml` with
`rules: [{ allow: [Template] }]`, and deploy. Later edits to that template need
no deployment.

**A template in this repository:** add the file under
`src/app-config.d/scaffolders/` and a `type: file` location pointing at
`/app/app-config.d/scaffolders/<file>`. Every edit needs a deployment.

To show it in a group on the **Create** page, give it a matching `spec.type` or
tags, or add a group under `sub-page:scaffolder/templates` in
`src/app-config.yaml`.

## Change the home page

Edit the `page:home` `defaultConfig` in `src/app-config.yaml` to move, resize,
add, or remove widgets, and update `src/app-config.test.ts` to match. Toolkit
links are in the `home-page-widget:home/toolkit` extension; the Datadog monitor
query is `home.datadog.query`.

Users with a saved layout keep it. Tell them to use **Restore defaults** after
a layout change.

## Add an application setting

A setting that differs per environment travels through four files:

1. `src/app-config.production.yaml`: reference it as `${MY_SETTING}`.
2. `template.yaml`: add a parameter (with `NoEcho: true` if sensitive) and an
   `Environment` entry on the application container.
3. `cfn-parameters.json`: map the parameter to `$vars.MY_SETTING` or
   `$secrets.MY_SETTING`.
4. GitHub: create the variable or secret where the `production` environment
   can read it.

Add a local value to `src/app-config.local.yaml`, and add the setting to
[Configuration](03-configuration.md).

## Move a secret out of the task definition

Secrets currently reach the container as plain `Environment` values. To keep
one out of the task definition:

1. Store it in Secrets Manager or as an SSM `SecureString`.
2. Replace its `Environment` entry with a `Secrets` entry whose `ValueFrom` is
   the secret or parameter ARN.
3. Grant the **task execution role** `secretsmanager:GetSecretValue` or
   `ssm:GetParameters` (and `kms:Decrypt` for a customer-managed key) on that
   ARN. The role belongs to `backstage-cluster`, so the change is made there.
4. Remove the CloudFormation parameter, its `cfn-parameters.json` entry, and
   the GitHub secret once nothing else uses them.

The same approach works for the Datadog Agent's `DD_API_KEY`. The two
credential files baked into the image need a different fix: load them at
start-up from Secrets Manager, or mount them, and stop copying
`app-config.d/credentials/` in `src/Dockerfile`.

## Change CPU, memory, and task count

Update `ContainerCpu`, `ContainerMemory`, or `ContainerDesiredCount` in
`cfn-parameters.json`. Use a valid Fargate CPU/memory combination; the Datadog
sidecar takes 256 CPU / 512 MB of the task.

Running more than one task is supported by Backstage, with two things to
check first: the in-memory duplicate-event guard is per task, and the database
must allow the extra connections.

To stop paying for the portal outside working hours, set
`ServiceScaleOutCron` and `ServiceScaleInCron` to Application Auto Scaling
schedule expressions such as `cron(0 8 ? * MON-FRI *)`, interpreted in
`ServiceScalingTimezone`. Setting only one creates only that action.

## Change the hostname or route

The portal's public URL appears in the `BACKSTAGE_APP_URL` and
`BACKSTAGE_BACKEND_URL` variables, in the Google and GitHub OAuth apps'
redirect URIs, and in DNS for the cluster ALB. Change them together.

`AlbRulePath` and `AlbRulePriority` in `cfn-parameters.json` control the
listener rule. The portal claims every path at priority `1`, so no other
service can share the cluster listener until that is narrowed. Backstage
expects to be served from the root of its hostname.

## Open a shell in the running task

The service enables execute-command, but `TaskIamRole` lacks the permissions.
Add this statement to the role in `template.yaml` and deploy:

```yaml
- Effect: Allow
  Action:
    - ssmmessages:CreateControlChannel
    - ssmmessages:CreateDataChannel
    - ssmmessages:OpenControlChannel
    - ssmmessages:OpenDataChannel
  Resource: '*'
```

Then, with `ecs:ExecuteCommand` permission and the Session Manager plugin:

```sh
aws ecs execute-command --cluster <cluster-name> --task <task-id> \
  --container backstage-app --interactive --command "/bin/bash"
```

The container holds production credentials. Follow your organization's
approval rules for interactive access.

## Inspect or replay catalog events

1. Find the outcome in the logs; see
   [Observability](06-observability.md#useful-log-filters).
2. To see full payloads, set `CatalogEventMessageLogLevel` to `info` in
   `cfn-parameters.json` and deploy. Return it to `debug` afterwards.
3. Check the dead-letter queue, `backstage-app-main-catalog-events-dlq.fifo`,
   for messages the backend never managed to consume.
4. To force convergence without waiting for the daily refresh, restart the
   task: the provider runs a full refresh five seconds after start-up.

## Rotate a credential

| Credential | Where to change it | Takes effect |
| --- | --- | --- |
| Database password, OAuth client secrets, ServerlessOps auth client, Datadog keys | The GitHub secret | Next `main` deployment |
| GitHub App private key, Google service-account key | The GitHub secret | Next `main` deployment, which rebuilds the image |

Re-run the `Main` workflow from `main` to deploy without a code change. Old
images in ECR still contain the previous credential files; revoke the old
credential at its source.

## Upgrade Backstage

From `src/`:

```sh
yarn backstage-cli versions:bump
```

This updates `src/backstage.json` and the `backstage:^` resolutions. Then:

1. Read the Backstage release notes for breaking changes and required
   migrations, and apply any template changes they call for.
2. Check that the three community GitHub plugins have compatible releases.
3. Keep the Node.js version aligned in `src/package.json` (`engines.node`) and
   the `FROM` line of `src/packages/backend/Dockerfile`. Native modules break
   when the build host and the image differ.
4. Run the full checks, start the app locally, and click through sign-in, the
   home page, a catalog entity's tabs, and a template form.
5. Push a branch to confirm the CI build before merging.

## Update this handbook

Edit the pages in `docs/handbook/` and the `nav` in `mkdocs.yml`. Preview with
the TechDocs CLI from the repository root:

```sh
npx @techdocs/cli serve
```

Merge documentation to `main` through a PR like any other change. Remember that
pushing `docs/` changes to a feature branch publishes them immediately; see
[CI/CD pipeline](05-ci-cd.md#techdocs-workflows).

## Validate and deploy changes

Run the application checks and `sam validate --lint`. Review the diff for IAM
changes, new environment variables, and anything that replaces the target
group, the listener rule, the queues, or the bucket.

Commit related application, infrastructure, and handbook updates together and
open a PR. Feature-branch pushes build but do not deploy; merging to `main`
deploys to `production`. After deployment, follow
[Reviewing a deployment](05-ci-cd.md#reviewing-a-deployment).

To roll back, revert the commit on `main`. The previous image is still in ECR
under its commit SHA, but the deployment rebuilds from source.
