import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const SERVER_ENV_KEYS = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_MODEL",
  "ANTHROPIC_MODEL",
  "AI_PROVIDER",
  "AI_FALLBACK_PROVIDER",
];

// Serves the same handler Vercel runs in production, so `npm run dev`
// and `npm run preview` work without a separate backend process.
function chatApiPlugin() {
  const mount = (middlewares) => {
    middlewares.use("/api/chat", async (req, res) => {
      const { default: handler } = await import("./api/chat.js");
      await handler(req, res);
    });
  };

  return {
    name: "local-chat-api",
    configureServer(server) {
      mount(server.middlewares);
    },
    configurePreviewServer(server) {
      mount(server.middlewares);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of SERVER_ENV_KEYS) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }

  return {
    plugins: [react(), chatApiPlugin()],
  };
});
