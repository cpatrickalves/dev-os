# Agent Spec Template & Examples

## Template Structure

```markdown
# Feature: [Feature Name]

## Context
[1-2 sentences: what exists today and why this change is needed]

## WHAT (Entities, States & Relationships)
- List every entity involved and its possible states
- Define state transitions and their permanence (reversible or not)
- Declare data lifecycle (retention, archival, deletion timelines)
- Specify relationships between entities

## WHO (Actors & Permissions)
- List every actor role that interacts with this feature
- Define what each role CAN and CANNOT do
- Specify authentication/authorization requirements
- Note any role-based visibility restrictions

## WHY (Business Rules & Constraints)
- State preconditions that must be met before actions can proceed
- Define side effects that must occur (webhooks, notifications, audit logs)
- List validation rules and error conditions
- Specify ordering or sequencing constraints
- Include compliance or regulatory requirements

## HOW (Technical Constraints)
- Specify the tech stack and relevant services
- Declare source-of-truth for each piece of state
- Note integration points (APIs, webhooks, queues)
- State performance requirements or limits
- Specify idempotency, retry, and failure handling expectations

## Acceptance Criteria
- [ ] Concrete, testable statement of correct behavior
- [ ] Another testable statement
- [ ] Edge case that must be handled correctly

## Out of Scope
- Explicitly list what this spec does NOT cover
- Prevents the AI from adding unrequested features
```

## Example 1: Subscription Cancellation

```markdown
# Feature: Subscription Cancellation

## Context
Users currently have no way to cancel their subscription through the app.
Support handles all cancellations manually via Stripe dashboard.

## WHAT
- A Subscription has three states: active, cancelled, expired.
- Cancellation is permanent — a cancelled subscription cannot be reactivated;
  a new subscription must be created instead.
- Subscription data is retained for 90 days post-cancellation, then purged.
- Each Subscription belongs to exactly one Account.

## WHO
- Account owners can initiate cancellation.
- Team members cannot cancel or view cancellation options.
- Billing admins can view cancellation status but cannot reverse it.
- System (cron) triggers the 90-day data purge.

## WHY
- A subscription cannot be cancelled while an unpaid invoice is outstanding.
  The user must clear their balance first.
- Cancellation must trigger an immediate webhook to Stripe.
- All state changes must be written to the audit log with timestamp and
  the ID of the user who initiated the action.
- Cancellation takes effect at the end of the current billing period,
  not immediately.

## HOW
- Node.js backend, Stripe for billing.
- Subscription state lives in Stripe — the local database reflects it,
  not the other way around. Never write subscription state directly to DB.
- All state changes flow through Stripe webhooks.
- The cancellation endpoint must be idempotent (calling it twice
  for the same subscription produces no error and no duplicate events).

## Acceptance Criteria
- [ ] Account owner can cancel from Settings > Billing > Cancel Subscription
- [ ] Cancellation is rejected with clear error if unpaid invoice exists
- [ ] Stripe webhook fires within 1 second of cancellation request
- [ ] Audit log entry includes user ID, timestamp, and subscription ID
- [ ] Team members see no cancellation UI elements
- [ ] Data purge job runs daily and removes records older than 90 days
- [ ] Calling cancel on an already-cancelled subscription returns 200 OK (idempotent)

## Out of Scope
- Pause/resume functionality (separate feature)
- Refund processing (handled by finance team via Stripe dashboard)
- Account deletion (distinct from subscription cancellation)
```

## Example 2: User Invitation System

```markdown
# Feature: Team Member Invitation

## Context
New team members are currently added by an admin directly creating their account.
This bypasses email verification and creates security gaps.

## WHAT
- An Invitation has four states: pending, accepted, expired, revoked.
- Pending invitations expire after 72 hours.
- Each invitation is tied to a specific email address and role.
- An email address can have at most one pending invitation per team at a time.
- Accepting an invitation creates a new User record linked to the Team.

## WHO
- Team admins can send, view, and revoke invitations.
- Team owners can do everything admins can, plus invite other admins.
- Regular members cannot send or manage invitations.
- The invited person (unauthenticated) can accept or ignore the invitation.

## WHY
- Invitations to email domains outside the organization's allowed list
  must be flagged for owner approval before sending.
- Revoking an invitation after it has been accepted has no effect —
  the user must be removed through the team management flow instead.
- Each invitation event (sent, accepted, expired, revoked) must produce
  an audit log entry.
- Rate limit: max 50 invitations per team per 24-hour window.

## HOW
- PostgreSQL for invitation records, SendGrid for email delivery.
- Invitation tokens are signed JWTs with 72-hour expiry baked into the token.
- Token validation must check both JWT expiry AND database state
  (to handle revocation).
- The accept endpoint must be idempotent — clicking the link twice
  after acceptance returns a friendly "already accepted" page, not an error.

## Acceptance Criteria
- [ ] Admin can invite by email from Team Settings > Members > Invite
- [ ] Invited user receives email within 30 seconds with a one-click accept link
- [ ] Expired invitation link shows "This invitation has expired" page
- [ ] Revoked invitation link shows "This invitation is no longer valid" page
- [ ] Duplicate invitation to same email returns error with clear message
- [ ] External domain invitation requires owner approval before email sends
- [ ] Rate limit returns 429 with retry-after header when exceeded

## Out of Scope
- Bulk invitation via CSV upload
- SSO/SAML auto-provisioning
- Invitation customization (custom message, branding)
```

## Ambiguity Detection Checklist

When reviewing a user story or spec for ambiguity, check for these common gaps:

### State & Lifecycle
- [ ] Are all possible states of each entity listed?
- [ ] Are state transitions defined (which transitions are allowed)?
- [ ] Is each transition reversible or permanent?
- [ ] What happens to related data when state changes?
- [ ] Are there time-based state changes (expiration, retention)?

### Permissions & Access
- [ ] Is every actor role listed?
- [ ] For each action, which roles CAN and CANNOT perform it?
- [ ] Are there visibility restrictions (who can see what)?
- [ ] What happens when an unauthorized user attempts the action?

### Business Rules
- [ ] Are preconditions stated (what must be true before the action)?
- [ ] Are postconditions stated (what must happen after the action)?
- [ ] Are there rate limits, quotas, or thresholds?
- [ ] What error messages should the user see for each failure mode?
- [ ] Are there compliance or audit requirements?

### Technical Boundaries
- [ ] Is the source of truth for each piece of state declared?
- [ ] Are integration points specified (APIs, webhooks, queues)?
- [ ] Is idempotency addressed for each mutating operation?
- [ ] Are failure and retry semantics defined?
- [ ] Are there performance requirements (latency, throughput)?

### Edge Cases
- [ ] What happens with concurrent requests?
- [ ] What happens if an external service is down?
- [ ] What happens at boundary values (empty lists, max limits)?
- [ ] What happens when the user retries or double-clicks?
