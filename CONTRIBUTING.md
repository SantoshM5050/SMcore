# Contributing Guidelines for Nexus Discord Bot

Thank you for contributing to **Nexus Discord Bot**!

## Code Style & Standards

- **TypeScript**: Enforce strict mode across all workspaces (`tsconfig.json`).
- **Formatting**: Run Prettier before opening pull requests:
  ```bash
  npm run format
  ```
- **Linting**: Ensure zero lint warnings or errors:
  ```bash
  npm run lint
  ```
- **Commit Messages**: Follow Conventional Commits convention:
  - `feat: add live embed variable replacement`
  - `fix: resolve role rename synchronization`
  - `docs: update API documentation`

---

## Pull Request Checklist

- [ ] Code builds without errors (`npm run build`)
- [ ] Tests pass cleanly (`npm test`)
- [ ] No hardcoded IDs or secrets committed
- [ ] Relevant documentation updated
