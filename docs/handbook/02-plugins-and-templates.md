# Plugins and templates

Local plugins live in `src/plugins/` as Yarn workspaces named
`@internal/backstage-plugin-<directory>`. Each has a `README.md` with its full
contract; this page is the map.

## Frontend modules

Registered in `src/packages/app/src/App.tsx`.

| Directory | Extends | What it adds |
| --- | --- | --- |
| `app-module-nav` | `app` | The sidebar: search, Home, Catalog, Catalog graph, Create, Directory, remaining pages sorted by title, notifications, and a Settings group holding unprocessed entities and the app visualizer. |
| `catalog-module-serverlessops` | `catalog` | The tabbed catalog index at `/catalog`, the **Directory** page at `/directory`, the **CI/CD**, **Activity**, **Relations**, and **Specs** entity tabs, and retitled Components, Resources, and Systems cards. |
| `api-docs-module-serverlessops` | `api-docs` | An **APIs** card on component pages. |
| `home-module-info-hub` | `home` | The logo, Datadog Monitors, My Systems, World Clocks, four GitHub work widgets, and Today's Calendar. |
| `scaffolder-entity-pickers` | `scaffolder` | The `SoContextualEntityPicker` and `SoRequestUserCredentials` form fields. |

`App.tsx` also defines the sign-in page and overrides the Toolkit widget's
renderer. Three community plugins (`github-actions`, `github-deployments`, and
`github-issues`) are installed for the cards the entity tabs reuse; their own
tabs and overview cards are switched off in `src/app-config.yaml`.

### Entity tabs

| Tab | Shown for | Content |
| --- | --- | --- |
| CI/CD | Components | Latest GitHub Actions run and GitHub deployments. Needs the `github.com/project-slug` annotation. |
| Activity | Components | Open GitHub issues for the repository. |
| Relations | All kinds | Relationship graph. |
| Specs | Components | `Resource` entities of type `doc-spec` that depend on the component, sorted by title, plus the **Create spec** button. |

**Create spec** is enabled only when the `template:default/1-speckit-feature`
template exists in the catalog and the user may create scaffolder tasks. The
template is loaded from another repository, so the button reports the workflow
as unavailable if that location fails to load.

### Form fields

| Field | Purpose |
| --- | --- |
| `SoContextualEntityPicker` | An entity picker whose `catalogFilter` can reference earlier answers, for example `relations.partOf: "{{ parameters.domain }}"`. |
| `SoRequestUserCredentials` | A hidden field that requests the user's GitHub token and stores it in a task secret, without showing a repository picker. |

## Backend plugins and modules

Registered in `src/packages/backend/src/index.ts`.

| Directory | Extends | What it adds |
| --- | --- | --- |
| `catalog-backend-module-serverlessops-catalog` | `catalog` | The entity provider for the ServerlessOps catalog API: scheduled full refresh plus `create`, `update`, and `delete` events from the `ServerlessOpsCatalog` topic. |
| `plugin-catalog-backend-module-google` | `catalog` | Entity providers for Google Workspace users and groups. |
| `datadog-backend` | New plugin `datadog` | `GET /api/datadog/monitors` for the home page widget. Requires a signed-in user. |
| `scaffolder-backend-module-serverlessops` | `scaffolder` | `serverlessops:catalog:*` actions. |
| `scaffolder-backend-module-github` | `scaffolder` | `x_github:*` actions. |
| `scaffolder-backend-module-github-copilot` | `scaffolder` | `github:copilot:agent:launch`. |
| `scaffolder-backend-module-github-speckit` | `scaffolder` | `github:speckit:*` actions. |
| `scaffolder-backend-module-datadog` | `scaffolder` | `x_datadog:*` actions. |

The backend also loads the standard app, proxy, events (with the AWS SQS
module), scaffolder (with the GitHub and notifications modules), TechDocs,
auth (guest, Google, and GitHub providers), catalog (with the GitHub,
scaffolder entity model, unprocessed entities, and logs modules), permission
(allow-all policy), search (PostgreSQL engine with catalog and TechDocs
collators), user settings, notifications, signals, and MCP actions plugins.

## Scaffolder actions

| Action | Purpose |
| --- | --- |
| `serverlessops:catalog:create` | Create an entity in the ServerlessOps catalog API. |
| `serverlessops:catalog:register` | Register a ServerlessOps catalog entity in Backstage. |
| `serverlessops:catalog:delete` | Delete an entity from the ServerlessOps catalog. |
| `x_github:clone` | Clone a repository into the workspace with history. |
| `x_github:commit` | Commit workspace changes on the checked-out branch. |
| `x_github:push` | Push workspace commits to GitHub through the API. |
| `x_github:commitFiles` | Commit workspace files on top of an existing branch. |
| `x_github:pr:create` | Open a pull request, or return the one already open. |
| `x_github:pr:comment` | Comment on a pull request. |
| `github:copilot:agent:launch` | Launch a GitHub Copilot agent task on a repository. |
| `github:speckit:init` | Initialize Spec Kit in the workspace with the `specify` CLI. |
| `github:speckit:workflow` | Run a Spec Kit workflow on the scaffolder host. |
| `github:speckit:constitution`, `specify`, `clarify`, `checklist`, `plan`, `tasks`, `analyze`, `taskstoissues`, `implement`, `converge` | Launch a Copilot task that runs one Spec Kit command. |
| `x_datadog:alarm:create` | Create or update Datadog metric monitors. |
| `x_datadog:dashboard:create` | Create or update Datadog dashboards from baselines. |

Things to know when writing templates:

- The `x_github:*`, Copilot, and Spec Kit agent actions call GitHub **as the
  user running the template**. Request the token with `SoRequestUserCredentials`
  or a repository picker's `requestUserCredentials`; the default secret key is
  `USER_GITHUB_TOKEN`.
- `github:speckit:init` and `github:speckit:workflow` run `specify`, and
  workflow command steps run `copilot` and `gh`, on the scaffolder host, which
  is the Backstage container. `x_github:commit` and `x_github:push` need `git`
  there too. `src/Dockerfile` installs `specify`, `gh`, and `copilot`.
- Copilot usage is billed to the owner of the token the action uses.
- The Datadog actions and the monitors endpoint share the one account
  configured under `integrations.datadog`.
- The running portal lists every installed action, with its input and output
  schema, at `/create/actions`.

## Registered templates

Production loads templates from the locations in
`src/app-config.production.yaml`.

| Source | Templates |
| --- | --- |
| This repository, `src/app-config.d/scaffolders/` | `1-domain-add`, `2-system-add`, `3-environment-add` |
| `backstage-aws-sam-python-template` | CRUD API, message event handler, scheduled event handler |
| `backstage-aws-sam-nodejs-template` | Node.js serverless application |
| `backstage-aws-sam-ecs-template` | ECS services |
| `backstage-aws-sam-rds-template` | RDS database |
| `backstage-aws-sam-empty-template` | Empty SAM project |
| `backstage-aws-sam-state-machine-template` | State machine, and state machine with API |
| `backstage-github-speckit-feature` | Spec, plan, and work templates for Spec Kit features |

The three local templates create a `Domain`, a `System`, or an environment
`Resource` through `serverlessops:catalog:create`. The entity reaches the
Backstage catalog through the provider's change event, or at the next daily
refresh. The environment template names the resource `env-<system>-<environment>`
and makes it depend on the chosen cloud-account resource.

The local files are copied into the image at `/app/app-config.d/scaffolders/`,
so a change to them reaches the portal through an application deployment.
Remote templates are re-read by the catalog on its normal refresh cycle and
need no deployment.

The **Create** page places a template in a group by its `spec.type`
(`domain`, `system`, `environment`) or its tags (`serverless` with `api` or
`event-driven`, `containerization`, `infrastructure`).
