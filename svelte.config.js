import { vitePreprocess } from "@sveltejs/kit/vite";
import { adapter, standardGetLast } from "sveltekit-adapter-versioned-worker";

const BASE_URL = "PWA-Streaming-Test";

const isDev = process.env.NODE_ENV !== "production";
const isTestBuild = process.env.DISABLE_BASE_URL === "true";

/** @type {import("@sveltejs/kit").Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		appDir: "app",
		paths: {
			base: (isTestBuild || isDev)? "" : `/${BASE_URL}`
		},
		adapter: adapter({
			isElevatedPatchUpdate: true,

			lastInfo: standardGetLast("https://hedgehog125.github.io/PWA-Streaming-Test/versionedWorker.json", isTestBuild),
			sortFile: ({ href }) => {
				if (href === "testVideo.mp4") return "never-cache";
			}
		})
	}
};

export default config;
