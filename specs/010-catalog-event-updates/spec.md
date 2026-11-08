# Feature Specification: Event-Driven Catalog Updates

**Feature Branch**: `010-catalog-event-updates`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "https://github.com/ServerlessOpsIO/backstage-app/issues/116"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New entities appear without polling delay (Priority: P1)

As a developer, when a new catalog entity is created in the upstream ServerlessOps system, I can find it in Backstage quickly without waiting for the next scheduled provider poll.

**Why this priority**: Faster visibility of new entities is the primary user value and removes immediate workflow delays.

**Independent Test**: Create a new upstream entity and verify it appears in Backstage within the freshness target, without waiting for a scheduled poll cycle.

**Acceptance Scenarios**:

1. **Given** a new upstream entity is created, **When** a create notification is delivered, **Then** the entity is added to the Backstage catalog.
2. **Given** a newly created entity appears in Backstage, **When** a developer searches for it, **Then** it is discoverable and usable for downstream tasks.
3. **Given** event notifications are temporarily unavailable, **When** the fallback sync cycle runs, **Then** the new entity is eventually added.

---

### User Story 2 - Entity updates and removals stay in sync (Priority: P1)

As a developer, when an existing upstream entity changes or is removed, Backstage reflects that change promptly so I can trust catalog accuracy.

**Why this priority**: Correctness of existing entities is as critical as initial creation for day-to-day operations.

**Independent Test**: Update an existing upstream entity and remove another one, then verify the catalog reflects each change within the freshness target.

**Acceptance Scenarios**:

1. **Given** an existing entity changes upstream, **When** an update notification is delivered, **Then** the Backstage entity reflects the new values.
2. **Given** an existing entity is removed upstream, **When** a delete notification is delivered, **Then** Backstage applies the existing removal behavior for that entity.
3. **Given** duplicate notifications are received for the same change, **When** they are processed, **Then** catalog state remains correct and does not duplicate entities.

---

### User Story 3 - Polling load is reduced while preserving reliability (Priority: P2)

As a platform operator, I can rely on event-driven updates for freshness and lower the frequency of scheduled provider polling to reduce operational cost, while keeping a fallback synchronization path.

**Why this priority**: Cost reduction is important but secondary to delivering accurate and timely catalog updates.

**Independent Test**: Reduce polling frequency from the current baseline, run normal create/update/delete activity, and verify both lower polling volume and maintained catalog consistency.

**Acceptance Scenarios**:

1. **Given** event-driven updates are active, **When** polling frequency is reduced, **Then** routine catalog freshness remains within target.
2. **Given** event delivery has a temporary disruption, **When** the fallback polling cycle runs, **Then** catalog consistency is restored without manual data correction.

---

### Edge Cases

- A notification arrives for an entity unknown to the provider due to delayed initial sync.
- Notifications for the same entity arrive out of order.
- A notification is missing required fields or contains an unsupported change type.
- Upstream sends repeated notifications for a previously processed change.
- Event delivery is delayed long enough that fallback polling updates the entity first.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The ServerlessOps catalog provider MUST process create, update, and delete notifications for entities within its ownership scope.
- **FR-002**: When a valid create notification is processed, the corresponding entity MUST be added to the Backstage catalog.
- **FR-003**: When a valid update notification is processed, the corresponding entity data in Backstage MUST be updated to the latest known values.
- **FR-004**: When a valid delete notification is processed, the corresponding entity MUST follow existing Backstage removal behavior for provider-managed entities.
- **FR-005**: Processing the same notification more than once MUST NOT create duplicate entities or regress entity state.
- **FR-006**: The provider MUST prevent stale notifications from overwriting newer entity state.
- **FR-007**: Invalid or unsupported notifications MUST be rejected with a recorded processing outcome, and MUST NOT stop processing of subsequent notifications.
- **FR-008**: Scheduled provider polling MUST remain available as a fallback synchronization mechanism.
- **FR-009**: The feature scope MUST be limited to the ServerlessOps catalog provider; other providers MUST remain unchanged.
- **FR-010**: Publishing notifications to the event channel is out of scope for this feature and remains an external dependency.
- **FR-011**: The system MUST provide an auditable outcome for each processed notification (success or failure reason) for operational support.

### Key Entities *(include if feature involves data)*

- **Catalog Entity Change Notification**: A message describing a single entity lifecycle change (create, update, or delete), including entity identity and change metadata.
- **Catalog Entity Record**: The provider-managed entity representation visible in Backstage catalog views.
- **Notification Processing Outcome**: A traceable result for each notification, including status and failure reason when applicable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 95% of valid create notifications are reflected in Backstage within 60 seconds of notification receipt.
- **SC-002**: At least 95% of valid update and delete notifications are reflected in Backstage within 60 seconds of notification receipt.
- **SC-003**: At least 99% of valid notifications are processed successfully without manual operator intervention over a rolling 7-day period.
- **SC-004**: Scheduled polling calls between Backstage and the upstream catalog service are reduced by at least 80% from the pre-feature baseline while maintaining catalog consistency.
- **SC-005**: In at least 95% of sampled trials, a developer can begin downstream setup on a newly created system within 2 minutes of upstream creation.

## Assumptions

- The upstream ServerlessOps catalog service emits create, update, and delete notifications for all relevant entity changes.
- Existing provider polling behavior remains in place as a fallback, with a longer polling interval than current baseline.
- Existing catalog ownership, visibility, and entity lifecycle rules remain unchanged.
- This feature does not introduce new user roles or permission models.
