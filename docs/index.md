# Documentation

platform / backstage / backstage-app

Backstage ECS Service & Task

This component is the ServerlessOps Backstage portal. It runs as an ECS
service on Fargate in the **backstage-cluster** cluster of the **backstage**
system, and stores its state in the **backstage-db** database. The repository
holds the Backstage application and its local plugins, the container image
build, the service's infrastructure, and the deployment and documentation
workflows.

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
