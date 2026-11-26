// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// (react, tanstack-router, etc.). Only add truly custom plugins here.
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv, type ConfigEnv } from "vite";

export default (configEnv: ConfigEnv) => {
  const env = loadEnv(configEnv.mode, process.cwd(), "VITE_SUPABASE_");
  const configuredUrl = env["VITE_SUPABASE_URL"];
  const configuredKey = env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  const [url, key] = configuredUrl && configuredKey
    ? [configuredUrl, configuredKey]
    : ["https://guamwtiurkxvabdqwgpc.supabase.co", "sb_publishable_Pcbu1odPaedQJc2TfwGu_A_zsMIPE0X"];

  return defineConfig({
    vite: {
      define: {
        // Publish may not have the local .env. Override the generated client's stale defaults.
        "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(url),
        "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(key),
      },
    },
    tanstackStart: {
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      // nitro/vite builds from this
      server: { entry: "server" },
    },
  })(configEnv);
};
