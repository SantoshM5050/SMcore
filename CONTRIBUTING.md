# Contributing Guidelines

Thank you for contributing to the **Discord Role Request Management Platform**!

## Code Style & Standards

- **TypeScript**: Strict mode enabled. Do not use `any` type without justification.
- **Formatting**: Format code using Prettier before opening pull requests:
  ```bash
  npm run format
  ```
- **Linting**: Ensure zero lint errors:
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
