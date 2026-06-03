module.exports = {
    // Test multiple projects (backend and frontend)
    projects: [
        {
            displayName: 'backend',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/tests/**/*.test.js'],
            setupFiles: ['<rootDir>/tests/jest.setup.js'],
            moduleFileExtensions: ['js', 'json', 'ts', 'node'],
            transform: {
                '^.+\\.js$': 'babel-jest'
            },
        },
        {
            displayName: 'frontend',
            testEnvironment: 'jsdom',
            testMatch: ['<rootDir>/tests/**/*.test.ts'],
            setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect'],
            transform: {
                '^.+\\.tsx?$': 'ts-jest'
            },
            moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json']
        }
    ]
};
