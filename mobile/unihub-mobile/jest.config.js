module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|react-native-worklets)'
  ],
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/src/shared/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/shared/hooks/$1',
    '^@/constants/(.*)$': '<rootDir>/src/shared/constants/$1',
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
