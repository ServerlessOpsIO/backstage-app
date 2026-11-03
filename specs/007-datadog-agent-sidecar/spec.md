# Feature Specification: Datadog Agent Sidecar for Backstage

**Feature Branch**: `007-datadog-agent-sidecar`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "As a developer I have logs Metrics for the backstage-app component in Datadog. Deploy the Datadog agent sidecar as a container in the ECS task. Acceptance criteria: AWS ECS metrics for the service show up in Datadog."

## Clarifications

### Session 2026-11-03

- Q: Should forwarding Backstage application logs to Datadog be part of this feature, or should this release deliver ECS metrics only? → A: ECS metrics only; application logs are already handled at the account setup level.
- Q: Which metrics must be visible in Datadog for the feature to pass acceptance? → A: Both task/container metrics and ECS service-level metrics.
- Q: What should happen when Datadog is not configured for a deployment? → A: Require valid Datadog configuration for every deployment.
- Q: Which approved secret source should provide the Datadog API key to the ECS task? → A: Use the existing CI/deployment secret injection path.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See ECS service metrics in Datadog (Priority: P1)

As a developer, I want the backstage-app service's task/container runtime metrics (CPU, memory, and health) and ECS service-level metrics (desired/running task count and deployments) to appear in Datadog so I can monitor the service without logging into AWS.

**Why this priority**: This is the stated acceptance criterion and the foundation for the existing Datadog alarm and dashboard work.

**Independent Test**: Deploy the service, open Datadog, and filter ECS metrics by the backstage-app service; data is present and current.

**Acceptance Scenarios**:

1. **Given** a deployed backstage-app ECS service with the Datadog agent running alongside the application, **When** a developer queries Datadog, **Then** task/container CPU, memory, and health metrics and ECS service desired/running task count and deployment metrics are shown.
2. **Given** the service is running, **When** the developer views the metrics, **Then** they are tagged so they can be filtered by service name and environment.

---

### User Story 2 - Application keeps working if monitoring fails (Priority: P2)

As an operator, I want the Backstage application to stay available even if the Datadog agent is unhealthy or Datadog is unreachable.

**Why this priority**: Monitoring must not reduce availability of the portal.

**Independent Test**: Stop or misconfigure the agent container and confirm the application still serves requests and the task is not killed.

**Acceptance Scenarios**:

1. **Given** the agent cannot start or reach Datadog, **When** the task runs, **Then** the Backstage application still starts and serves traffic.

---

### Edge Cases

- The Datadog API key is missing: deployment is rejected; if the configured key is invalid or Datadog is unreachable at runtime, the application remains unaffected and the key is never exposed in plain text.
- The agent needs extra CPU and memory: the task has enough capacity for both containers without starving the application.
- Multiple environments (e.g. dev, prod) deploy the service: each reports under its own environment tag.
- Datadog is not configured for a deployment: deployment requires valid Datadog configuration.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The backstage-app ECS task MUST run a Datadog agent as an additional container alongside the application container.
- **FR-002**: Task/container CPU, memory, and health metrics and ECS service desired/running task count and deployment metrics for the backstage-app service MUST be delivered to Datadog and be viewable there.
- **FR-003**: Metrics MUST carry service and environment tags consistent with the existing Datadog alarm and dashboard conventions.
- **FR-004**: The Datadog API key MUST be supplied from a secure secret store through the existing CI/deployment secret injection path and MUST NOT appear in source control or plain-text task configuration.
- **FR-005**: The Datadog site and environment-specific values MUST be configurable per deployment rather than hard-coded.
- **FR-006**: Failure of the configured agent MUST NOT stop or restart the application container.
- **FR-007**: The task's allocated resources MUST accommodate both containers.
- **FR-008**: Deployment documentation MUST describe required Datadog configuration and how to verify data in Datadog.

### Key Entities

- **ECS Task**: The deployed unit of the backstage-app service, containing the application container and the agent container.
- **Datadog Agent Container**: Companion container that collects and forwards metrics for the task.
- **Datadog Credentials**: Secret used to authenticate the agent with Datadog.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Within 10 minutes of a deployment, task/container CPU, memory, and health metrics and ECS service desired/running task count and deployment metrics for the backstage-app service are visible in Datadog.
- **SC-002**: 100% of backstage-app tasks in a deployed environment report task/container CPU, memory, and health metrics and ECS service desired/running task count and deployment metrics to Datadog.
- **SC-003**: With the agent stopped, the Backstage portal remains available with no additional downtime.
- **SC-004**: No Datadog credentials are present in the repository or in plain-text deployment configuration.

## Assumptions

- A Datadog account and API key already exist and the key can be stored in the project's existing secret store.
- The Datadog API key is provided through the existing CI/deployment secret injection path; deployments require valid Datadog configuration.
- Application log forwarding is handled at the account setup level and is out of scope for this feature.
- Existing Datadog alarm and dashboard specs (003, 004) define the tagging conventions to reuse.
- The service runs on AWS ECS as described in the repository's existing deployment assets.
- Distributed tracing and custom application metrics are out of scope for this feature.
- The AWS-side Datadog integration is not required; the sidecar is the delivery mechanism.
