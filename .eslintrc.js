module.exports = {
  "extends": "eslint:recommended",
  "parser": "babel-eslint",
  "parserOptions": {
      "sourceType": "script"
  },
  "rules": {
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "semi": ["error", "always"]
  },
  "env": {
      "node": true,
      "mocha": true,
      "es6": true
  },
  "globals": {
      "assert": true,
      "artifacts": true,
      "contract": true,
      "web3": true
  }
};
