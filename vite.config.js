import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import adapter from "@sveltejs/adapter-auto";

export default defineConfig({
    plugins: [
        sveltekit({
            adapter: adapter(),
        }),
    ],
    server: {
        host: "127.0.0.1",
        port: 5173,
    },
});
