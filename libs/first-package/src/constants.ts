export const defaultExtensions = [
  ".js",
  ".cjs",
  ".mjs",
  ".ts",
  ".mts",
  ".tsx",
  ".jsx",
  ".vue",
  ".svelte",
];
const testFileExtensions = defaultExtensions
  .map((extension) => extension.slice(1))
  .join(",");

export const defaultExclude = [
  ".storybook/**",
  "coverage/**",
  "packages/*/test{,s}/**",
  "**/*.d.ts",
  "test{,s}/**",
  `test{,-*}.{${testFileExtensions}}`,
  `**/*{.,-}{spec,stories,types}.{${testFileExtensions}}`,
  "**/__tests__/**",
  "**/*-entry.js",

  /* Exclude common development tool configuration files */
  "**/{ava,babel,nyc}.config.{js,cjs,mjs}",
  "**/jest.config.{js,cjs,mjs,ts}",
  "**/{karma,rollup,webpack}.config.js",
  "**/.{eslint,mocha}rc.{js,cjs}",
];
