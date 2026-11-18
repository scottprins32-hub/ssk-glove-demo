import { defineConfig } from "vite";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "path";
import base44 from "@base44/vite-plugin";

const packageSite = fileURLToPath(new URL("./scripts/build-static-site.py", import.meta.url));

// The Base44 dashboard runs Vite directly. Serve the same validated static
// build as npm run build, including the order pages and runtime image packs.
const staticSite = {
  name: "ssk-static-production-site",
  apply: "build",
  writeBundle: {
    order: "post",
    sequential: true,
    handler({ dir }) {
      if (!dir) this.error("The SSK static site requires a build output directory.");
      execFileSync("python3", [packageSite, "--output", resolve(dir)], { stdio: "inherit" });
    },
  },
};

// The live app is the static 2.5D glove configurator that already lives in
// glove_builder/customiser (index.html + app.js + glove-engine.js + ds/tokens
// + assets). Serve that folder as the Vite root so its index.html and all its
// relative asset paths resolve unchanged, while the @base44/vite-plugin wires
// up the sandbox iframe (CORS/frame-ancestors headers, HMR, error overlay).
export default defineConfig({
  root: "glove_builder/customiser",
  plugins: [base44(), staticSite],
  // node_modules lives at the repo root, one level above the customiser root.
  server: {
    fs: { allow: ["../.."] },
  },
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    // The static packager replaces this intermediate Vite output.
    minify: false,
    cssMinify: false,
    rollupOptions: {
      input: {
        main: resolve("glove_builder/customiser/index.html"),
        gallery: resolve("glove_builder/customiser/gallery.html"),
      },
    },
  },
});
