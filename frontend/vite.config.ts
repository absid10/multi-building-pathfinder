import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true, // ✅ allow LAN and ngrok access
    port: 8080,
    allowedHosts: [
      "reyes-tubate-luca.ngrok-free.dev", // ✅ your ngrok host
      ".ngrok-free.dev", // ✅ allow any future ngrok URLs (safe & optional)
    ],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
