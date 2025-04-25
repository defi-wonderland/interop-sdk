#!/bin/bash

# Check if a package name is provided
if [ $# -eq 0 ]; then
    echo "Please provide a package name."
    echo "Usage: ./create-package.sh <package-name>"
    exit 1
fi

PACKAGE_NAME=$1
PACKAGE_DIR="packages/$PACKAGE_NAME"

# Check if the package already exists
if [ -d "$PACKAGE_DIR" ]; then
    echo "Error: A package with the name '$PACKAGE_NAME' already exists."
    exit 1
fi

# Get the parent package name from the root package.json
PARENT_PACKAGE_NAME=$(node -p "require('./package.json').name")

# Create package directory structure
mkdir -p "$PACKAGE_DIR/src"
mkdir -p "$PACKAGE_DIR/test"

# Create src files
echo "export * from \"./external.js\";" > "$PACKAGE_DIR/src/index.ts"
echo "// Add your internal exports here" > "$PACKAGE_DIR/src/internal.ts"
echo "// Add your external exports here" > "$PACKAGE_DIR/src/external.ts"

# Create test file
cat << EOF > "$PACKAGE_DIR/test/index.spec.ts"
import { describe, it } from "vitest";

describe("dummy", () => {
    it.skip("dummy", () => {});
});
EOF

# Create package.json
cat << EOF > "$PACKAGE_DIR/package.json"
{
    "name": "@$PARENT_PACKAGE_NAME/$PACKAGE_NAME",
    "version": "0.0.1",
    "private": true,
    "description": "",
    "license": "MIT",
    "author": "Wonderland",
    "type": "module",
    "main": "./dist/src/index.js",
    "types": "./dist/src/index.d.ts",
    "directories": {
        "src": "src"
    },
    "files": [
        "dist/*",
        "package.json",
        "!**/*.tsbuildinfo"
    ],
    "scripts": {
        "build": "tsc -p tsconfig.build.json",
        "check-types": "tsc --noEmit -p ./tsconfig.json",
        "clean": "rm -rf dist/",
        "format": "prettier --check \"{src,test}/**/*.{js,ts,json}\"",
        "format:fix": "prettier --write \"{src,test}/**/*.{js,ts,json}\"",
        "lint": "eslint \"{src,test}/**/*.{js,ts,json}\"",
        "lint:fix": "pnpm lint --fix",
        "test": "vitest run --config vitest.config.ts --passWithNoTests",
        "test:cov": "vitest run --config vitest.config.ts --coverage"
    }
}
EOF

# Create README.md
cat << EOF > "$PACKAGE_DIR/README.md"
# $PARENT_PACKAGE_NAME: $PACKAGE_NAME package

Description of your package goes here.

## Setup

1. Install dependencies running \`pnpm install\`

## Available Scripts

Available scripts that can be run using \`pnpm\`:

| Script        | Description                                             |
| ------------- | ------------------------------------------------------- |
| \`build\`       | Build library using tsc                                 |
| \`check-types\` | Check types issues using tsc                            |
| \`clean\`       | Remove \`dist\` folder                                    |
| \`lint\`        | Run ESLint to check for coding standards                |
| \`lint:fix\`    | Run linter and automatically fix code formatting issues |
| \`format\`      | Check code formatting and style using Prettier          |
| \`format:fix\`  | Run formatter and automatically fix issues              |
| \`test\`        | Run tests using vitest                                  |
| \`test:cov\`    | Run tests with coverage report                          |

## Usage

Describe how to use your package here.

## API

Describe your package's API here.

## References

Add any relevant references here.
EOF

# Create tsconfig.json
cat << EOF > "$PACKAGE_DIR/tsconfig.json"
{
    "extends": "../../tsconfig.json",
    "include": ["src/**/*"]
}
EOF

# Create vitest.config.ts
cat << EOF > "$PACKAGE_DIR/vitest.config.ts"
import path from "path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["test/**/*.spec.ts"],
        exclude: ["node_modules", "dist"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            exclude: ["node_modules", "dist", "src/index.ts", ...configDefaults.exclude],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
        },
    },
});
EOF

# Create tsconfig.build.json
cat << EOF > "$PACKAGE_DIR/tsconfig.build.json"
{
    "extends": "../../tsconfig.build.json",
    "compilerOptions": {
        "composite": true,
        "declarationMap": true,
        "declaration": true,
        "outDir": "dist"
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "test"]
}
EOF

echo "Package '$PACKAGE_NAME' created successfully in '$PACKAGE_DIR'"
