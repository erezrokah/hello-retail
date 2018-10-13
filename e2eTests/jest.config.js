module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globalSetup: '<rootDir>/src/setup_hook.js',
  setupTestFrameworkScriptFile: '<rootDir>/src/setupFrameworks.ts',
  roots: ['<rootDir>/src'],
};
