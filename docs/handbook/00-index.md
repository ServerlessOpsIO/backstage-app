# Project handbook

This handbook describes **backstage-app**: the ServerlessOps Backstage portal
and the ECS service that runs it. Keep it current as the application, its
plugins, the infrastructure, and the workflows change.

- [Features](01-features.md): what the portal offers its users and how the service runs on ECS.
- [Plugins and templates](02-plugins-and-templates.md): local plugins, scaffolder actions, form fields, and registered templates.
- [Configuration](03-configuration.md): app-config layers, deployment parameters, tags, secrets, and prerequisites.
- [Architecture](04-architecture.md): AWS resources, request and event flows, image and repository anatomy.
- [CI/CD pipeline](05-ci-cd.md): application and infrastructure builds, deployment, TechDocs publishing, and feature branches.
- [Observability](06-observability.md): logs, health, metrics, Datadog, and an investigation checklist.
- [Common tasks](07-common-tasks.md): run locally, add plugins and templates, change configuration, upgrade, and deploy.

## Reading in Backstage

`catalog-info.yaml` contains `backstage.io/techdocs-ref: dir:.`. The
`Techdocs - Docs` workflow builds the Markdown files in `docs/` with the
repository-root `mkdocs.yml` and publishes the site to the TechDocs S3 bucket.
Open the `backstage-app` component in the catalog and select **Docs**.

The portal itself uses an external TechDocs builder, so it never generates
documentation on demand: a page appears only after the workflow has published
it. See [CI/CD pipeline](05-ci-cd.md#techdocs-workflows).

The pages can also be read directly in GitHub. Paths shown in backticks are
relative to the repository root. The Backstage monorepo lives under `src/`, so
`src/packages/backend` is the backend package and `src/app-config.yaml` is the
base configuration.

## Related components

| Component | Relationship |
| --- | --- |
| `backstage-cluster` | Provides the ECS cluster, the shared ALB and listener, the task security group, and the task execution role. |
| `backstage-db` | Provides the PostgreSQL database the backend stores its state in. |
| `serverlessops-catalog-api` | Source of truth for domains, systems, and resources. The portal polls it and receives its change events. |

## Content review

Before treating this handbook as the operational reference, review the
sections on network exposure, secrets handling, IAM permissions, and deployment
assumptions against the running system. Several pages point out behavior that
is worth confirming or changing; they describe what the repository does today,
not a recommended end state.
