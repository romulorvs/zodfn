module.exports = {
  preset: "ts-jest",
  verbose: true,
  extensionsToTreatAsEsm: [".ts"],
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
};
