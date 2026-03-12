import type { Config } from 'jest'

const sharedConfig = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
      },
    }],
  },
}

const config: Config = {
  projects: [
    {
      ...sharedConfig,
      displayName: 'unit',
      testMatch: ['<rootDir>/src/tests/unit/**/*.test.tsx'],
    },
    {
      ...sharedConfig,
      displayName: 'schemas',
      testMatch: ['<rootDir>/src/tests/schemas/**/*.test.tsx'],
    },
  ],
}

export default config
