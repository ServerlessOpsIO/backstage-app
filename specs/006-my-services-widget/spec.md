# Feature Specification: My Services Homepage Widget

**Feature Branch**: `[006-my-services-widget]`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "As a developer I see my services on the backstage homepage

**Describe the solution you'd like**

When I log in there is a widget which shows the services I own either directly or via group membership.

**Acceptance criteria**

 - [ ] new widget with my services appears"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See services I own on the homepage (Priority: P1)

As a signed-in developer, when I open the portal homepage I see a "My Services" widget listing every service in the software catalog that I own, whether ownership is assigned to me personally or to a team (group) I belong to. Each service name takes me to that service's catalog page.

**Why this priority**: This is the entire requested capability. It removes the need to search or filter the catalog to find the services a developer is responsible for.

**Independent Test**: Sign in as a user who directly owns one service and belongs to a group that owns another; open the homepage and confirm both services are listed and each links to its catalog page.

**Acceptance Scenarios**:

1. **Given** a signed-in user who is the direct owner of service A, **When** they open the homepage, **Then** the My Services widget lists service A.
2. **Given** a signed-in user who is a member of group G, and group G owns service B, **When** they open the homepage, **Then** the My Services widget lists service B.
3. **Given** a service owned by a group the user does not belong to, **When** the user opens the homepage, **Then** that service is not listed.
4. **Given** a listed service, **When** the user selects its name, **Then** they are taken to that service's catalog page.
5. **Given** a service the user owns both directly and through a group, **When** the widget loads, **Then** the service appears exactly once.

---

### User Story 2 - Understand why and how I own each service (Priority: P2)

As a developer who belongs to several teams, I can see which owner (me or a specific group) each listed service belongs to, plus its lifecycle stage, so I can tell at a glance which team context a service sits in and whether it is in production.

**Why this priority**: Adds context that makes the list actionable for members of multiple teams, but the list alone already delivers the core value.

**Independent Test**: Sign in as a member of two groups that each own a service; confirm each row shows the correct owning group and lifecycle.

**Acceptance Scenarios**:

1. **Given** a listed service owned by group G, **When** the widget loads, **Then** the row shows group G as the owner, linked to the group's catalog page.
2. **Given** a listed service with a lifecycle value (e.g., production, experimental), **When** the widget loads, **Then** the row shows that lifecycle.

---

### User Story 3 - Navigate a long list of owned services (Priority: P3)

As a developer on a team that owns many services, I can page through the full list in the widget and jump to the complete filtered catalog view of my owned services.

**Why this priority**: Only matters for users who own more services than fit in the widget; most users are served by Story 1.

**Independent Test**: Sign in as a member of a group that owns more services than one widget page shows; confirm paging reaches every service and the "view all" link opens the catalog filtered to the user's owned services.

**Acceptance Scenarios**:

1. **Given** a user who owns more services than fit on one widget page, **When** they move to the next page, **Then** the next set of services is shown, and every owned service is reachable.
2. **Given** the widget, **When** the user selects "View all", **Then** they are taken to the catalog showing services they own.

---

### Edge Cases

- User owns no services directly or through any group: the widget shows an explicit empty message (e.g., "You don't own any services yet") with a link to the catalog, rather than a blank area.
- Signed-in identity has no matching user record in the catalog (e.g., a guest or unregistered user): the widget shows the empty state and does not error.
- The catalog cannot be reached or returns an error: the widget shows an unavailable message, and all other homepage widgets remain usable.
- Services are still loading: the widget shows a loading indicator rather than an empty message.
- A user's group memberships change in the catalog: the widget reflects the new ownership the next time the homepage is loaded after the catalog has been updated.
- A service has no lifecycle value: the row shows the service without a lifecycle label rather than failing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The homepage MUST include a "My Services" widget for signed-in users.
- **FR-002**: The widget MUST list catalog components of type "service" whose owner is the signed-in user.
- **FR-003**: The widget MUST also list catalog components of type "service" whose owner is any group the signed-in user is a direct member of.
- **FR-004**: The widget MUST NOT list services owned only by users or groups the signed-in user has no ownership relationship with.
- **FR-005**: Each service MUST appear at most once, even when the user owns it through more than one path.
- **FR-006**: Each listed service MUST show its name (preferring its display title when one exists), linking to its catalog page.
- **FR-007**: Each listed service SHOULD show its owner, linked to the owner's catalog page, and its lifecycle when present.
- **FR-008**: Services MUST be ordered alphabetically by displayed name.
- **FR-009**: When the user owns more services than one page of the widget shows (default 10), the widget MUST provide paging so every owned service is reachable.
- **FR-010**: The widget MUST provide a "View all" link to the catalog filtered to services owned by the signed-in user.
- **FR-011**: The widget MUST show distinct loading, empty, and unavailable states, and a failure in this widget MUST NOT hide or break other homepage widgets.
- **FR-012**: The widget MUST show only catalog information the signed-in user is already permitted to see in the catalog.
- **FR-013**: Adding the widget MUST preserve all widgets and links required by the existing homepage specification (005-homepage-info-hub).

### Key Entities *(include if feature involves data)*

- **Signed-in User**: The person viewing the homepage, identified by their catalog user record, which includes the groups they are a member of.
- **Group**: A team in the catalog; a user may belong to many groups, and a group may own many services.
- **Service**: A catalog component of type "service" with a name, optional display title, owner (a user or group), lifecycle, and catalog page.
- **Ownership Relationship**: The link between a service and its owner; a user owns a service directly when they are its owner, or indirectly when a group they belong to is its owner.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of homepage loads for signed-in users include the My Services widget.
- **SC-002**: For a test set of users, the widget lists exactly the services each user owns directly or through group membership: no missing services and no services they don't own.
- **SC-003**: Developers can reach the catalog page of any service they own from the homepage in two clicks or fewer (at most one page change plus one selection).
- **SC-004**: The widget's contents are visible within 3 seconds of the homepage loading under normal conditions.
- **SC-005**: When the catalog is unavailable, or the user owns no services, the widget shows an explicit message, and every other homepage widget remains usable.

## Assumptions

- "Services" means catalog components of type "service". Other component types (websites, libraries) and other entity kinds (APIs, resources, systems) are out of scope for this widget.
- Group ownership counts direct group memberships recorded on the user's catalog record. Ownership inherited through parent groups of the user's groups is out of scope for this version.
- Users sign in with an identity that resolves to a user record in the catalog. Users without one, such as local guest sign-in, see the empty state.
- The widget is read-only: it does not create, edit, or reassign services.
- Placement within the existing homepage grid follows the layout established by 005-homepage-info-hub. The exact position and size are design decisions for planning, provided no existing required widget is removed.
- Ownership data comes from the existing software catalog. No new external integration or credential is required.
