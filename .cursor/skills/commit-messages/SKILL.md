---
name: commit-messages
description: Generates and suggests commit messages following Conventional Commits (type, optional scope, subject). Use when the user asks for a commit message, when reviewing staged or recent changes, or when preparing to commit.
---

# Commit Messages

## Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

- **type**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, or `perf`
- **scope**: optional, area of the codebase (e.g. `auth`, `backend`, `frontend`)
- **subject**: imperative, lowercase start, no period at end, ~50 chars

## Rules

- Subject line: start with a verb in imperative mood (“add” not “added”, “fix” not “fixes”).
- No period at the end of the subject.
- Keep subject under ~72 characters; wrap body at 72 if needed.
- Body and footer are optional; use when the change needs explanation or references (e.g. “Fixes #123”).

## Examples

**Single-line (most common):**
```
feat(auth): add JWT login endpoint
fix(backend): prevent crash when tree has no members
docs(readme): add Railway deployment steps
chore(deps): bump prisma to 5.22
refactor(trees): extract layout logic into helper
```

**With scope and body:**
```
feat(timeline): add real-time comments via Socket.IO

Wire SocketContext to backend socket server; emit and listen
for new comments so all viewers see updates without refresh.
```

**Fix with issue reference:**
```
fix(photos): resolve relative photo URLs in production

Prepend VITE_API_URL origin so images load from backend.
Fixes #42
```

## Deriving the message

When suggesting a message from changes:

1. Run or inspect `git diff --staged` (or `git diff`) to see what changed.
2. Pick **type** from the kind of change (feature, bugfix, docs, refactor, etc.).
3. Pick **scope** from affected area (file path or module).
4. Write a **subject** that summarizes the change in one imperative sentence.

Prefer one logical change per commit; if the diff mixes multiple concerns, suggest splitting or one message that captures the main change.
