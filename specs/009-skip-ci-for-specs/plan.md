# Implementation Plan: Skip CI for Documentation and Spec Changes

**Branch**: `009-skip-ci-for-specs` | **Spec**: [spec.md](./spec.md)

## Summary

Add trigger-level `paths-ignore` filters to the existing push triggers in
`.github/workflows/branch.yml` and `.github/workflows/main.yml`. The configured
patterns are `docs/**` and `specs/**`. A push runs the workflow if it includes
any changed path outside those ignored patterns. The existing
`workflow_dispatch` triggers, branch filters, jobs, and job names remain
unchanged.

This is a small workflow configuration change. It does not add a classifier,
reusable workflow, script, job-level condition, or special required-check
handling.

## Technical Context

- **Technology**: GitHub Actions YAML
- **Files changed**: `.github/workflows/branch.yml`,
  `.github/workflows/main.yml`
- **Validation**: Review the workflow diff to confirm the filters are limited
  to the existing push triggers and other triggers and jobs are unchanged.
- **Behavior**: `docs/**` and `specs/**` ignore documentation paths at any depth.
- **Non-file-change triggers**: `workflow_dispatch` remains unaffected.
- **Required checks**: These are trigger-level filters, so an ignored push
  does not start the workflow or produce its job checks. This plan does not
  introduce replacement checks.

## Project Structure

```text
.github/workflows/
├── branch.yml   # Ignore configured docs/spec paths on push
└── main.yml     # Ignore configured docs/spec paths on push
```

No application code, workflow jobs, or additional CI infrastructure is
required.
