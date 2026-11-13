# backstage-app

platform / backstage / backstage-app

Backstage ECS Service & Task

This component is the ServerlessOps Backstage portal. It runs as an ECS
service on Fargate in the **backstage-cluster** cluster of the **backstage**
system, and stores its state in the **backstage-db** database. The repository
holds the Backstage application and its local plugins, the container image
build, the service's infrastructure, and the deployment and documentation
workflows.

## Handbook

The [project handbook](handbook/00-index.md) is the reference for this service:

- [Features](handbook/01-features.md): what the portal offers its users and how the service runs on ECS.
- [Plugins and templates](handbook/02-plugins-and-templates.md): local plugins, scaffolder actions, form fields, and registered templates.
- [Configuration](handbook/03-configuration.md): app-config layers, deployment parameters, tags, secrets, and prerequisites.
- [Architecture](handbook/04-architecture.md): AWS resources, request and event flows, image and repository anatomy.
- [CI/CD pipeline](handbook/05-ci-cd.md): application and infrastructure builds, deployment, TechDocs publishing, and feature branches.
- [Observability](handbook/06-observability.md): logs, health, metrics, Datadog, and an investigation checklist.
- [Common tasks](handbook/07-common-tasks.md): run locally, add plugins and templates, change configuration, upgrade, and deploy.

## Where to start

- **Running the portal locally:** follow
  [Set up a development environment](handbook/07-common-tasks.md#set-up-a-development-environment).
- **Deploying the service for the first time:** complete the
  [deployment prerequisites](handbook/03-configuration.md#deployment-prerequisites).
- **Changing the portal:** find the change in
  [Common tasks](handbook/07-common-tasks.md), then
  [validate and deploy](handbook/07-common-tasks.md#validate-and-deploy-changes).
- **Writing a software template:** see the actions and form fields in
  [Plugins and templates](handbook/02-plugins-and-templates.md).
- **Investigating a problem:** follow the
  [investigation checklist](handbook/06-observability.md#investigation-checklist).
