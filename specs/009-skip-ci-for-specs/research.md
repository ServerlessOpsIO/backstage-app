# Research: Skip CI for Spec-Only Changes

## 1. Trigger-level `paths-ignore` vs job-level gating
- **Decision**: Job-level gating on a classifier output; no `paths`/`paths-ignore` on triggers.
- **Rationale**: Workflows with a path-filtered trigger that does not run leave required checks "Pending" and block merging (FR-006). Skipped jobs (`if` false) report success. Gating also allows classification on the final diff and fails open on unknowns.
- **Alternatives**: `paths-ignore: specs/**` (simple, but blocks required checks and gives no fail-open); a separate same-named "no-op" workflow with `paths: specs/**` (fires on mixed changes too, since any matching file triggers it, so it can mask failures, violating FR-006).

## 2. Classification method
- **Decision**: `git diff --name-only <before> <sha>` (final diff, not per commit); `code_changed=true` if any path is outside `specs/` (rename sources and destinations both appear with `--no-renames`).
- **Rationale**: Matches clarification 3A (reverted outside changes → skipped). `--no-renames` ensures a move from `src/` into `specs/` still counts as code.
- **Alternatives**: `dorny/paths-filter` (third-party dependency, extra supply-chain surface); per-commit checks (contradicts 3A).

## 3. Fail-open cases
- **Decision**: `code_changed=true` when event is not `push`, `before` is all zeros (new branch), the before commit is unavailable (force push), or diff errors.
- **Rationale**: Never hide validation. A new-branch push runs everything, which is existing behavior.
- **Alternatives**: Diff new branches against `main`: saves runs but adds a fetch and edge cases; deferred.

## 4. Reuse for future workflows (FR-004)
- **Decision**: Reusable workflow `changes.yml` with `code_changed` output; documented pattern in the contract.
- **Alternatives**: Copy-pasted steps per workflow (drift risk).

## 5. Required checks and `needs`
- **Decision**: Gate each job with `needs: changes` and `if: needs.changes.outputs.code_changed == 'true'`; `deploy` keeps `needs: [build_infra, build_container]`, so it is skipped when they are skipped, and its extra `if` is unneeded. Required checks keep existing job names. Note: a reusable-workflow job's check name is prefixed (`changes / classify`); do not make it required unless desired.
- **Rationale**: Skipped dependents are skipped; a failed dependency still blocks. No repository-settings change is expected, since existing check names are unchanged.

## 6. Platform limits
- Accepted per spec: >1,000 commits or diff timeouts; the classifier uses local git on a full-depth-enough fetch (`fetch-depth: 0`), so the 300-file limit does not apply, a strict improvement.
