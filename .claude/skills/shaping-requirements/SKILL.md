---
name: shaping-requirements
description: Shape functional requirements for new or modified full-stack features through guided questioning. Asks one question at a time to ensure complete understanding with no unknowns, covering UI, API, data model, business logic, and permissions. Saves requirements to the requirements folder. Automatically use when user requests to "define feature", "shape requirements", "spec out feature", "add feature requirements", "modify feature", or "remove feature".
---

# Shaping Requirements

Shape functional requirements for full-stack features through a structured questioning process. Focuses on **functional behavior** (what the system does and what the user can see and do) rather than implementation choices (which library, pattern, or infrastructure to use). Asks targeted questions one at a time until requirements are clear across every layer of the stack.

## When to Use This Skill

Use this skill when:

- User wants to "define a new feature" or "add feature requirements"
- User asks to "shape requirements" or "spec out a feature"
- User wants to "modify an existing feature"
- User needs to "remove a feature" and document implications
- Starting work on any new functionality, frontend, backend, or both

## What Counts as "Functional" vs. "Implementation"

Requirements describe observable behavior, not how it's built. The line runs through every layer:

| Layer | Functional (in scope) | Implementation (out of scope) |
| --- | --- | --- |
| UI | What the user sees, states, interactions | Which component library, CSS approach |
| API | Endpoints, request/response shape, status codes, validation rules | Which framework, routing internals |
| Data | Entities, fields, relationships, what gets persisted | Which database, ORM, indexing strategy |
| Logic | Business rules, calculations, state transitions, workflows | Which design pattern, where code lives |
| Auth | Who can do what, visibility rules | Which auth provider, token mechanics |

When in doubt: if a tester could verify it from outside the system, it's a requirement.

## What This Skill Does

### Phase 1: Context Gathering

1. Understand what feature is being discussed
2. Research the existing codebase across the stack (see Step 1)
3. Identify what is already known vs. what needs clarification

### Phase 2: Guided Questioning

4. Ask ONE question at a time
5. Provide options with recommendations when possible
6. Cover: user stories, UI behavior, API/data, business rules, permissions, edge cases
7. Continue until requirements are unambiguous

### Phase 3: Requirements Documentation

8. Structure requirements in the appropriate format
9. Save to `docs/requirements/` folder as markdown

## How to Use This Skill

### Step 1: Research First

**CRITICAL**: Before asking questions, explore the codebase across all relevant layers. Adapt the paths below to the actual project structure.

**Frontend / client:**
- Related pages, routes, and navigation flows
- Existing components and UI patterns that could be reused
- Client-side state and data-fetching layer (e.g. RTK Query services, `gen/sdk/`, hooks)

**API / backend:**
- Existing endpoints, route handlers, controllers (e.g. Next.js `app/api/`, route files, server actions)
- Service / business-logic layer and how it's organized
- Request validation and error-handling conventions
- Authentication and authorization middleware

**Data:**
- Database schema, models, migrations
- Relevant entities and their relationships
- How similar data is currently persisted and queried

**Integrations:**
- External services or third-party APIs already wired up
- Background jobs, webhooks, queues, or scheduled tasks

### Step 2: Identify the Unknowns

After research, separate what requires user clarification from what the codebase already answers. Don't ask about anything the code makes obvious.

### Step 3: Ask Questions One at a Time

**CRITICAL RULES:**

- Ask ONLY ONE question per message
- Provide 2-4 options when possible
- Include a recommendation if you have enough context
- Wait for the answer before proceeding

**Question Categories for Full-Stack Features:**

1. **User & Goal** — Who is this for and what do they want to accomplish?
2. **UI Behavior** — What should the user see and interact with? (if there's a UI)
3. **Data & Domain Model** — What entities, fields, and relationships are involved? What's new vs. existing?
4. **API & System Behavior** — What endpoints/actions are needed? What goes in and comes out? What gets validated?
5. **Business Logic & Rules** — Calculations, workflows, state transitions, constraints, side effects.
6. **Persistence** — What gets stored, updated, or deleted? Any schema changes?
7. **User Actions** — What can the user do (create, edit, delete, filter, sort, export)?
8. **Navigation** — How does the user reach this feature and where do they go after?
9. **Permissions & Access Control** — Who can see and do what? Role or ownership rules?
10. **Integrations** — External services, webhooks, or background jobs involved?
11. **Edge Cases** — Empty states, errors, loading, validation failures, concurrency, rate limits.
12. **Scope Boundaries** — What is explicitly NOT included?

Not every category applies to every feature. A pure UI tweak may only touch 1, 2, and 8; a backend-only job may skip the UI entirely. Use the categories as a checklist, not a script.

### Step 4: Structure the Requirements

**Simple Features** (single interaction, one layer):

```markdown
# [Feature Name]

## User Story

As a [user type], I want [goal], so that [reason].

## Behavior

- [What the user sees / what the system does]
- [What the user can interact with or trigger]

## Data & API (if applicable)

- [New or changed entities/fields]
- [Endpoint(s), request/response shape, validation]

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Out of Scope

- Item not included
```

**Medium Features** (multiple interactions, spans layers):

```markdown
# [Feature Name]

## Overview

[Brief description]

## User Stories

### Story 1: [Name]
### Story 2: [Name]

## UI Specifications

### Page Layout
### Components
### Interactions

## Data Model

[Entities, fields, relationships; new vs. existing]

## API Contract

[Endpoints/actions: method, path, request, response, status codes, validation rules]

## Business Rules

[Calculations, constraints, state transitions, side effects]

## Permissions

[Who can do what]

## Acceptance Criteria

[Organized by story]

## Edge Cases

[Empty state, error handling, loading, validation failures]

## Dependencies

[API endpoints, existing components, external services]
```

**Complex Features** (full module spanning client, API, and data):

```markdown
# [Feature Name]

## Problem Statement

[What problem does this solve?]

## Proposed Solution

[High-level description]

## User Flows

### Flow 1: [Name]
[Step-by-step user journey, end to end]

## UI Specifications

### Pages
### Components
### Dialogs/Drawers

## Data Model

### Entities & Relationships
### New/Changed Fields & Migrations

## API Contract

### Endpoints / Actions
[Per endpoint: method, path, request body, response shape, status codes]

### Validation Rules

### Auth & Permissions

## Business Logic

### Rules & Calculations
### State Transitions / Workflows
### Side Effects (notifications, jobs, webhooks)

## Functional Requirements

### Must Have
### Nice to Have

## Edge Cases & Error Handling

[Empty, error, loading, validation, concurrency, rate limits, partial failure]

## Dependencies

[API endpoints, existing features, external services, background jobs]

## Out of Scope
```

### Step 5: Save Requirements

Save to `docs/requirements/[feature-name].md` with a descriptive kebab-case filename.

## Question Flow Example

**User:** "I want to add a dashboard for brand analytics"

**Claude researches the codebase:**

- Finds an existing dashboard at `pages/brands/[brandId]/dashboard.tsx`
- Finds a `brandDashboardApi` client service and the `app/api/brands/[brandId]/` route handlers behind it
- Reviews the `Generation` and `Asset` models in the schema to see what metrics are already capturable

**Claude asks Question 1 (Scope):**

> I see there's already a basic brand dashboard backed by `brandDashboardApi`. Are you looking to:
>
> - **Enhance the existing dashboard** — add sections/widgets to the current page
> - **Create a new analytics page** — a separate dedicated page
> - **Replace the current dashboard** — redesign from scratch
>
> _Recommendation: Enhance the existing one — the data layer is already partly there._

**User:** "Enhance the existing dashboard"

**Claude asks Question 2 (Data & Domain):**

> What metrics should it show?
>
> - **Creative performance** — generation counts, success rates, time to complete
> - **Asset usage** — most-used assets, storage metrics
> - **Activity timeline** — recent actions across the brand
> - **All of the above**

**User:** "Creative performance"

**Claude asks Question 3 (API & System Behavior):**

> The current endpoint returns totals only. Creative performance needs time-series data. How should it be queried?
>
> - **Fixed last-30-days window** — simplest, one new aggregate query
> - **Selectable range** (7/30/90 days) — adds a `range` query param to the endpoint
> - **Custom date picker** — full `from`/`to` params, most flexible
>
> _Recommendation: Selectable range — covers most needs without custom-picker complexity._

...continues through permissions, edge cases (no generations yet → empty state, slow query → loading state), and scope boundaries until requirements are clear...

## Important Guidelines

**DO:**

- Research the codebase across all layers BEFORE asking questions
- Ask ONE question at a time
- Provide options with recommendations
- Define observable behavior at every layer: UI, API contract, data shape, business rules, permissions
- Cover states: loading, error, empty, success, validation failure
- Save to `docs/requirements/`

**DON'T:**

- Ask multiple questions at once
- Ask questions answerable from existing code
- Prescribe implementation (which ORM, state library, queue, design pattern)
- Make assumptions without confirming
- Skip edge cases, error scenarios, or permission rules
- Create requirements without user confirmation

## Notes

- Requirements define WHAT the system does, not HOW it's built
- Each requirement should be testable from outside the system
- A feature spec should be coherent end to end — UI, API, and data should agree
- The resulting requirements feed into the `planning-features` skill
- Update existing requirement files rather than creating duplicates
