import { sassPlugin } from "esbuild-sass-plugin";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  outDir: "dist",
  esbuildPlugins: [sassPlugin()],
});
