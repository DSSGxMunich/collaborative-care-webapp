import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// GitHub Pages serves project sites from a subpath (e.g.
// /collaborative-care-webapp/), so the deploy workflow sets this to the repo
// name. Locally (dev/preview) it stays "/".
const basePath = process.env["GITHUB_PAGES_BASE"] ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    // tanstackStart must come before viteReact().
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts
      // (our SSR error wrapper). nitro/vite builds from this.
      server: { entry: "server" },
      router: { basepath: basePath },
      // All routes are static (no dynamic segments), so prerender every one
      // to real HTML at build time. That lets `bun run build` produce a
      // folder that can be served with no backend, e.g. GitHub Pages.
      prerender: { enabled: true, crawlLinks: true },
    }),
    nitro(),
    viteReact(),
  ],
});
