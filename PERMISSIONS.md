# Agent Permissions Policy (PERMISSIONS.md)

Authoritative rules for Codex CLI agents operating in this repository. Use this as the single source of truth for what is allowed, what requires approval, and what is forbidden.

## Environment Defaults

- Filesystem: workspace-write (may read/write inside this repo only)
- Network: restricted (no network without explicit approval)
- Approvals: on-request (escalate when sandbox prevents essential actions)

## Allowed Without Approval

- Read operations within the workspace:
  - List/search files (prefer `rg`, fallback to `find`/`dir`)
  - Read files in chunks ≤ 250 lines
- Local, non-destructive commands without network or privileged writes (e.g., `node -v`, `python -V`)
- Apply file changes via `apply_patch` within the workspace
- Run formatters/linters/tests only if they do not attempt network access and do not write outside the workspace
- Create/update documentation and code strictly related to the task

## Requires Approval

- Any command that:
  - Performs network access (e.g., `npm install`, `pip install`, `git clone`, `curl`)
  - Writes outside the workspace or to protected paths (e.g., `.git`, system dirs)
  - Is destructive beyond the immediate task (e.g., `rm -rf`, `git reset --hard`)
  - Launches GUI apps or opens external tools
  - Fails due to sandboxing but is important to complete the task
- Running tests/builds that create artifacts outside the repo or rely on network

When escalating, include a 1-sentence justification. Example:

- with `functions.shell`: set `with_escalated_permissions: true` and provide a concise `justification`.

## Forbidden

- Exfiltration or disclosure of secrets/tokens/credentials
- Adding license headers or vanity comments unless explicitly requested
- Refactoring or changing unrelated code, or fixing unrelated tests
- Committing or creating branches unless the user explicitly asks

## Operational Guidance

- Prefer `rg` for search: `rg "pattern"` and `rg --files`
- Keep changes minimal, focused, and stylistically consistent with the codebase
- Use `update_plan` for multi-step work; keep exactly one `in_progress` step
- Provide a brief preamble before grouped tool calls

## Examples

Allowed (no approval needed):
- Search symbols: `rg "getQuestions|QuestionService"`
- Read file sections: show ≤ 250 lines at a time
- Patch file(s): use `apply_patch` to update files in this repo

Approval required:
- Install deps: `npm install`, `pip install -r requirements.txt`
- Pull assets: `curl https://...`
- Destructive ops: `rm -rf build/` (if not explicitly requested)

---

This policy is specific to this repository and complements AGENTS.md. If in doubt, ask one concise clarifying question and proceed once unblocked.

