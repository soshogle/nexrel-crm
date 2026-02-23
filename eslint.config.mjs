import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".tmp-*/**",
      "out/**",
      "dist/**",
      "public/assets/**",
      "owner-websites/**",
      "nexrel-ecommerce-template/**",
      "nexrel-service-template/**",
      "Theodora-Stavropoulos-Remax/**",
      "darksword-armory/**",
      "scripts/**",
      "backups/**",
      "prisma/migrations/**",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "react/no-children-prop": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "@next/next/no-img-element": "off",
      "@next/next/no-assign-module-variable": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "@/lib/db",
              importNames: ["prisma"],
              message:
                "Direct prisma imports bypass DAL routing. Use getCrmDb() from @/lib/dal or getRouteDb() from @/lib/dal/get-route-db instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/dal/**", "lib/db/**", "lib/auth.ts", "tests/**"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["scripts/**"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];

export default config;
