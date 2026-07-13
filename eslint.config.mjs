import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: [
      "src/app/stkde-3d/page.tsx",
      "src/app/stkde/lib/StkdeRouteShell.tsx",
      "src/components/ui/place-autocomplete.tsx",
      "src/hooks/useSuggestionGenerator.ts",
      "src/hooks/useURLFeatureFlags.ts",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/components/ui/map.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: [
      "src/components/viz/SimpleCrimePoints.tsx",
      "src/components/viz/Trajectory.tsx",
      "src/components/viz/TrajectoryLayer.tsx",
      "src/components/viz/shaders/ghosting.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".venv-experiment2/**",
    "datapreprocessing/.venv/**",
  ]),
]);

export default eslintConfig;
