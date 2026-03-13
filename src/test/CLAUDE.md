# src/test/ — Agent Context

## Test Infrastructure

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit/component test runner. Config in `vitest.config.ts`. Environment: `jsdom`. Globals enabled. |
| **@testing-library/react** | Component rendering + queries |
| **Playwright** | E2E tests. Config in `playwright.config.ts` + `playwright-fixture.ts` (uses `lovable-agent-playwright-config`). No custom E2E tests written yet. |

## Files

| File | Purpose |
|------|---------|
| setup.ts | Imports `@testing-library/jest-dom` matchers + mocks `window.matchMedia` |
| example.test.ts | Placeholder test: `expect(true).toBe(true)` |

## Running Tests

```bash
npm run test        # Single run
npm run test:watch  # Watch mode
```

Test file pattern: `src/**/*.{test,spec}.{ts,tsx}`
