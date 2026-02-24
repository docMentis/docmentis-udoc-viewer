import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
    // Global ignores
    {
        ignores: [
            "**/dist/",
            "**/node_modules/",
            "examples/",
            "packages/udoc-viewer/src/wasm/",
            "packages/udoc-viewer/src/ui/viewer/styles-inline.ts",
        ],
    },

    // Base: ESLint recommended for all files
    js.configs.recommended,

    // TypeScript recommended rules
    ...tseslint.configs.recommended,

    // TypeScript files
    {
        files: ["**/*.ts"],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/consistent-type-imports": [
                "error",
                { prefer: "type-imports", fixStyle: "separate-type-imports" },
            ],
            "@typescript-eslint/no-empty-function": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-empty-object-type": "off",
        },
    },

    // Build scripts (plain JS, Node environment)
    {
        files: ["packages/udoc-viewer/scripts/**/*.js"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
        rules: {
            "@typescript-eslint/no-require-imports": "off",
        },
    },

    // Vite/Vitest config files (Node environment)
    {
        files: ["**/vite.config.ts", "**/vitest.config.ts"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },

    // Prettier compat (must be last)
    eslintConfigPrettier,
);
