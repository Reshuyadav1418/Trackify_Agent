module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.spec.ts'],
  moduleNameMapper: {
    '^@teamlogger/shared$': '<rootDir>/../../packages/shared/dist/cjs/index.js',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
  },
  detectOpenHandles: true,
  forceExit: true,
};
