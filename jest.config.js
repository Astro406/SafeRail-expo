module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'es2020',
          module: 'commonjs',
          strict: true,
          esModuleInterop: true,
          types: ['jest', 'node'],
          paths: {
            '@/*': ['./src/*'],
          },
        },
      },
    ],
  },
};
