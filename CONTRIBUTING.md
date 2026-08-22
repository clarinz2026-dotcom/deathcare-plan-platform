# Contributing to LifePlan

Thank you for your interest in contributing to LifePlan! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/lifeplan.git
   cd lifeplan
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Set up Convex:
   ```bash
   bun convex dev
   ```
5. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Guidelines

### Code Style

- **TypeScript strict mode** — All code must pass `tsc --noEmit` without errors
- **Functional components** — Use React functional components with hooks
- **Convex queries** — Use reactive queries, avoid unnecessary client state
- **Tailwind CSS** — Use existing theme tokens, don't invent new utilities
- **Monospace typography** — Use `font-mono` class for data and status elements

### Commit Messages

Write clear, descriptive commit messages:

```
feat: add CSV export for payments
fix: correct delinquency calculation for zero-day edge case
docs: update README with contributing guidelines
refactor: extract payment form into reusable component
```

### Pull Request Process

1. Update the README.md if you add features or change setup steps
2. Ensure all TypeScript checks pass
3. Test your changes on both desktop and mobile viewports
4. Keep PRs focused — one feature or fix per PR
5. Write a clear PR description explaining what changed and why

### Convex Functions

- Keep queries reactive (no manual refresh needed)
- Use proper indexes for filtered queries
- Validate inputs with Convex validators
- Handle authentication with `getAuthUserId()`
- Test on the Convex dashboard before committing

## Reporting Issues

### Bug Reports

Please include:
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Browser and device info
- Console error messages if any

### Feature Requests

Please include:
- Clear description of the feature
- Use case / why it's needed
- Mockups or examples if applicable

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help newcomers feel welcome
- No harassment or discrimination

## Questions?

Open a [GitHub Discussion](https://github.com/YOUR_USERNAME/lifeplan/discussions) for general questions.
