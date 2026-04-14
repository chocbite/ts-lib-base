import { defineConfig } from "tsdown";

export default defineConfig({
  banner: { js: "import './style.css';" },
  deps: {
    skipNodeModulesBundle: true,
  },
});
