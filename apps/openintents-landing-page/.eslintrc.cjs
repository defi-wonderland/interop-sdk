/** @type {import('eslint').Linter.Config} */
module.exports = {
    extends: ["../../.eslintrc.cjs"],
    rules: {
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-unsafe-member-access": "warn",
    },
};
