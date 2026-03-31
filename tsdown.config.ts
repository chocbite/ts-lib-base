import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  outDir: "dist",
  banner: { js: "import './index.css';" },
  css: {
    fileName: "index.css",
  },
  deps: {
    onlyBundle: false,
  },
});
