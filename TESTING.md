# Testing Suite Documentation

## Overview

This project uses **Jest** and **React Testing Library** for comprehensive testing coverage. The test suite includes unit tests, component tests, API route tests, and integration tests.

## Test Structure

```
__tests__/
├── lib/                    # Unit tests for utility functions
│   ├── hmac.test.ts       # HMAC signature generation & verification
│   ├── utils.test.ts      # Utility functions (cn, etc.)
│   └── validation.test.ts # Zod schema validations
├── components/            # Component tests
│   └── button.test.tsx    # UI component tests
├── api/                   # API route tests
│   ├── helpers.ts         # Test utilities and mocks
│   └── routes.test.ts     # API endpoint tests
└── integration/           # Integration tests
    └── workflows.test.ts  # End-to-end workflow tests
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests for CI/CD
npm run test:ci
```

### Specific Test Suites

```bash
# Run only unit tests
npm run test:unit

# Run only component tests
npm run test:components

# Run only API tests
npm run test:api

# Run only integration tests
npm run test:integration
```

## Test Coverage

Current coverage targets:
- **Statements**: 20%
- **Branches**: 20%
- **Functions**: 20%
- **Lines**: 20%

View detailed coverage report:
```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory:
- `coverage/lcov-report/index.html` - HTML report (open in browser)
- `coverage/lcov.info` - LCOV format for CI tools

## Writing Tests

### Unit Tests Example

```typescript
import { sign, verify } from '@/lib/hmac'

describe('HMAC Utilities', () => {
  it('should generate a valid signature', () => {
    const signature = sign('data', 'secret')
    expect(signature).toBeDefined()
  })

  it('should verify correct signature', () => {
    const signature = sign('data', 'secret')
    const isValid = verify('data', 'secret', signature)
    expect(isValid).toBe(true)
  })
})
```

### Component Tests Example

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('should handle click events', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click</Button>)
    await user.click(screen.getByRole('button'))
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### API Route Tests Example

```typescript
import { createMockRequest, createMockSupabaseClient } from './helpers'

describe('API Routes', () => {
  it('should validate authentication', async () => {
    const mockRequest = createMockRequest('/api/clients', {
      method: 'GET',
    })
    
    const mockSupabase = createMockSupabaseClient()
    // Mock authentication logic
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    })
    
    // Test your API endpoint logic here
  })
})
```

### Integration Tests Example

```typescript
describe('Client Management Workflow', () => {
  it('should create and retrieve a client', async () => {
    const mockSupabase = createMockSupabaseClient()
    
    // Mock insert operation
    const newClient = { name: 'John', email: 'john@example.com' }
    mockSupabase.from = jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: '1', ...newClient },
        error: null,
      }),
    }))
    
    const result = await mockSupabase
      .from('clients')
      .insert(newClient)
      .select()
      .single()
    
    expect(result.data).toMatchObject(newClient)
  })
})
```

## Test Configuration

### Jest Configuration (`jest.config.js`)

- **Test Environment**: `jest-environment-jsdom` (for React components)
- **Setup Files**: `jest.setup.js` (global mocks and configurations)
- **Module Name Mapping**: Path aliases (`@/` maps to project root)
- **Coverage Collection**: From `app/`, `components/`, and `lib/` directories
- **Transform Ignore Patterns**: Handles ES modules from `uuid` and `@supabase`

### Setup File (`jest.setup.js`)

Includes:
- `@testing-library/jest-dom` matchers
- Environment variable mocks
- Next.js router mocks
- Supabase client mocks

## Mocking

### Supabase Client Mock

```typescript
const mockSupabase = createMockSupabaseClient()

// Mock successful query
mockSupabase.from = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({
    data: { id: '1', name: 'Test' },
    error: null,
  }),
}))
```

### Next.js Router Mock

Already configured in `jest.setup.js`:

```typescript
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    }
  },
}))
```

## Best Practices

1. **Test Organization**
   - Group related tests using `describe` blocks
   - Use clear, descriptive test names
   - Follow the Arrange-Act-Assert pattern

2. **Test Coverage**
   - Aim for meaningful coverage, not just high percentages
   - Focus on critical business logic
   - Test edge cases and error scenarios

3. **Mocking**
   - Mock external dependencies (Supabase, Stripe, etc.)
   - Use `createMockSupabaseClient()` for consistent database mocks
   - Keep mocks simple and focused

4. **Async Testing**
   - Use `async/await` for asynchronous operations
   - Always wait for promises to resolve
   - Use `waitFor` from Testing Library when needed

5. **Component Testing**
   - Test user interactions, not implementation details
   - Use `screen.getByRole()` for accessibility
   - Simulate user events with `userEvent` library

## CI/CD Integration

For continuous integration, use:

```bash
npm run test:ci
```

This command:
- Runs tests once (no watch mode)
- Generates coverage report
- Limits workers to 2 for better CI performance
- Fails if coverage thresholds are not met

### GitHub Actions Example

```yaml
- name: Run Tests
  run: npm run test:ci

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Check path aliases in `jest.config.js`
   - Ensure `moduleNameMapper` is configured correctly

2. **Request/Response not defined**
   - Use mock helpers from `__tests__/api/helpers.ts`
   - Next.js edge runtime requires special handling

3. **React component errors**
   - Ensure `@testing-library/dom` is installed
   - Check that `jest-environment-jsdom` is configured

4. **Timeout errors**
   - Increase timeout: `jest.setTimeout(10000)`
   - Check for unresolved promises

## Future Improvements

- [ ] Add E2E tests with Playwright
- [ ] Increase coverage to 50%+ for critical paths
- [ ] Add visual regression testing
- [ ] Implement snapshot testing for components
- [ ] Add performance testing
- [ ] Set up mutation testing

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Test Statistics

Total Test Suites: **6**
Total Tests: **68**
- Unit Tests: 33 (hmac, utils, validation)
- Component Tests: 12 (button)
- API Tests: 6 (routes)
- Integration Tests: 17 (workflows)

Coverage achieved:
- `lib/hmac.ts`: 91.66%
- `lib/utils.ts`: 100%
- `lib/validation.ts`: 47.22%
- `components/ui/button.tsx`: 90%
