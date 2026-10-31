module.exports = {
  testEnvironment: "node",
  silent: true,
  modulePathIgnorePatterns: ["<rootDir>/gen/"],
  testPathIgnorePatterns: ["/node_modules/", "/gen/"],
  reporters: ["default", "<rootDir>/tests/results-reporter.js"],
};
