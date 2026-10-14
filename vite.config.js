import { defineConfig } from "vite";
import base44 from "@base44/vite-plugin";

// The live app is the static 2.5D glove configurator that already lives in
// glove_builder/customiser (index.html + app.js + glove-engine.js + ds/tokens
// + assets). Serve that folder as the Vite root so its index.html and all its
// relative asset paths resolve unchanged, while the @base44/vite-plugin wires
// up the sandbox iframe (CORS/frame-ancestors headers, HMR, error overlay).
export default defineConfig({
  root: "glove_builder/customiser",
  plugins: [base44()],
  // node_modules lives at the repo root, one level above the customiser root.
  server: {
    fs: { allow: ["../.."] },
  },
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
});