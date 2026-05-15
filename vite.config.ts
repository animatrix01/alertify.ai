import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

// SSR entry is `src/server.ts` - configured for Vercel deployment
export default defineConfig(async (env) => {
  const { mode } = env;

  const envDefine: Record<string, string> = {};
  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
  for (const [key, value] of Object.entries(loadedEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  // Expose server-only env vars to SSR via process.env (never sent to browser)
  const allEnv = loadEnv(mode, process.cwd(), "");
  if (allEnv.GROQ_API_KEY) {
    envDefine[`process.env.GROQ_API_KEY`] = JSON.stringify(allEnv.GROQ_API_KEY);
  }

  return {
    define: envDefine,
    resolve: {
      alias: {
        "@": `${process.cwd()}/src`,
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      ...tanstackStart({
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
        server: { 
          entry: "server",
          preset: "vercel",
        },
      }),
      react(),
    ],
    server: {
      host: "::",
      port: 3000,
      strictPort: true,
    },
  };
});
