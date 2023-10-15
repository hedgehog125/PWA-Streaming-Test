import { sveltekit } from "@sveltejs/kit/vite";
import { manifestGeneratorPlugin } from "sveltekit-adapter-versioned-worker";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		sveltekit(),
		manifestGeneratorPlugin()
	]
});