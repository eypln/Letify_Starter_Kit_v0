const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

const criticalConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
  },
  collectCoverageFrom: [
    'lib/api/diagnostic-routes.ts',
    'lib/billing-pricing.ts',
    'lib/billing.ts',
    'lib/rate-limit.ts',
    'lib/billing-schemas.ts',
    'lib/errorHandler.ts',
    'lib/hmac.ts',
    'lib/revenue-calculations.ts',
    'lib/revenue-date-validation.ts',
    'lib/stripe-webhook-helpers.ts',
    'lib/stripe-credit-helpers.ts',
    'lib/utils.ts',
    'lib/validation.ts',
    'app/api/stripe/billing-portal/route.ts',
    'app/api/stripe/checkout/subscription/route.ts',
    'app/api/stripe/webhook/route.ts',
    'app/api/admin/approve-user/route.ts',
    'app/api/admin/approved-users/route.ts',
    'app/api/admin/blocked-users/route.ts',
    'app/api/admin/pending-users/route.ts',
    'app/api/admin/invoices/route.ts',
    'app/api/admin/invoices/number/route.ts',
    'app/api/admin/invoices/generate/route.ts',
    'app/api/add-user-credits/route.ts',
    'app/api/add-test-credits/route.ts',
    'app/api/test-add-credits/route.ts',
    'app/api/notifications/send/route.ts',
  ],
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '__tests__/api/helpers.ts',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|@supabase)/)',
  ],
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20,
    },
  },
}

module.exports = createJestConfig(criticalConfig)
