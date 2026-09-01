# Linux Terminal / Git Workflow

## Development Environment

The canonical local development environment for ClinicOS is:

- Linux operating system.
- Standard Linux Terminal.
- Bash-compatible shell.
- Git.
- Node.js and npm according to repository requirements.
- Local repository path is typically `~/ClinicOS`.

The development environment is NOT Termux and is NOT an Android terminal environment.

Android is a future ClinicOS client/platform target and is separate from the development workstation.

## AI Responsibilities

For every implementation task the AI must:

1. Inspect the current repository state.
2. Read project instructions and `docs/ai/`.
3. Inspect relevant code and tests.
4. Identify exact files requiring changes.
5. Provide Linux Terminal commands when direct execution is unavailable.
6. Never ask the user to manually type source code when a complete command can perform the change.
7. Validate the implementation.
8. Review Git status and Git diff.
9. Update project memory.
10. Commit and push only after successful validation.
11. Verify GitHub after pushing when available.

## Standard Validation

\`\`\`bash
cd ~/ClinicOS
npm run typecheck
npm run lint
npm test
git diff --check
git status --short
\`\`\`

## Git Workflow

Before changes:

\`\`\`bash
cd ~/ClinicOS
git pull --ff-only origin main
git status --short
\`\`\`

After implementation and validation:

\`\`\`bash
git status
git diff --check
git add .
git commit -m "<provided commit message>"
git push origin "\$(git branch --show-current)"
\`\`\`

Never claim a push or remote verification succeeded without evidence.

## GitHub Repository

https://github.com/Awsan-cmd/ClinicOS

The repository is the durable source of truth.

A future AI or developer must be able to resume development from the repository, Git history, tests, and `docs/ai/` without relying on previous chat history.
