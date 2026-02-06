# Workflow System Test Suite

Comprehensive test suite for both Generic Multi-Industry Workflows and Real Estate Workflows.

## Test Structure

```
tests/
├── setup.ts                    # Test configuration and mocks
├── unit/                       # Unit tests
│   └── executors/
│       ├── medical-executor.test.ts
│       ├── restaurant-executor.test.ts
│       ├── construction-executor.test.ts
│       └── real-estate-executor.test.ts
├── api/                        # API endpoint tests
│   ├── workflows.test.ts       # Generic workflows API
│   └── real-estate-workflows.test.ts  # RE workflows API
├── integration/                # Integration tests
│   └── workflow-execution.test.ts
└── e2e/                        # End-to-end tests
    └── workflows.spec.ts      # Playwright E2E tests
```

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Unit tests only
npm run test:unit

# API tests only
npm run test:api

# Integration tests only
npm run test:integration

# E2E tests (requires dev server running)
npm run test:e2e

# Watch mode (for development)
npm run test:watch

# With coverage
npm run test:coverage
```

## Test Coverage

### Unit Tests
- ✅ Medical Executor (9 actions)
- ✅ Restaurant Executor (9 actions)
- ✅ Construction Executor (7 actions)
- ✅ Real Estate Executor (all actions)

### API Tests
- ✅ Generic Workflows API (GET, POST, PUT, DELETE)
- ✅ Templates API
- ✅ Execution API
- ✅ HITL Approval/Rejection API
- ✅ Real Estate Workflows API

### Integration Tests
- ✅ Workflow instance creation
- ✅ Task execution flow
- ✅ HITL gate handling
- ✅ Branching logic
- ✅ Workflow completion

### E2E Tests
- ✅ UI workflow builder
- ✅ Task creation and editing
- ✅ Drag and drop
- ✅ Template loading
- ✅ Workflow execution
- ✅ HITL approval flow
- ✅ Real Estate specific features

## Test Environment

Tests use mocked services:
- Prisma Client (mocked)
- Twilio SMS (mocked)
- SendGrid Email (mocked)
- Calendar Service (mocked)
- ElevenLabs (mocked)
- Data Enrichment Service (mocked)

## Writing New Tests

1. **Unit Tests**: Test individual functions in isolation
2. **API Tests**: Test HTTP endpoints with mocked database
3. **Integration Tests**: Test full workflows with mocked external services
4. **E2E Tests**: Test UI interactions in browser

## Notes

- Tests require `.env.test` file for environment variables
- E2E tests require the dev server to be running
- Mock implementations are in `tests/setup.ts`
