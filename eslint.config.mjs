import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import reactHooks from "eslint-plugin-react-hooks";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
    // 1. Global ignores
    {
        ignores: [
            "**/node_modules/**",
            "**/dist/**",
            "**/build/**",
            "**/.next/**",
            "**/generated/**",
        ],
    },

    // 2. Base JS rules for all files
    js.configs.recommended,

    // 3. TypeScript rules for all packages
    {
        files: ["packages/**/*.ts", "packages/**/*.tsx"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: __dirname,
            },
        },
        plugins: { "@typescript-eslint": tsPlugin },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            // TypeScript already catches undefined references; no-undef causes false positives
            // for Node.js globals (process, console, __dirname) and imported types
            "no-undef": "off",
            // Allow unused variables/params prefixed with _ (common convention for intentionally unused)
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
        },
    },

    // 4. Frontend: Next.js + React Hooks rules
    {
        files: ["packages/frontend/**/*.{ts,tsx,js,jsx}"],
        plugins: {
            "@next/next": nextPlugin,
            "react-hooks": reactHooks,
        },
        rules: {
            ...nextPlugin.configs["core-web-vitals"].rules,
            ...reactHooks.configs.recommended.rules,
            // App Router doesn't use a pages/ directory
            "@next/next/no-html-link-for-pages": "off",
        },
    },

    // 5. Prettier last — disables conflicting formatting rules and runs prettier as a lint rule
    prettierRecommended,
];
