import { virtualRoutes } from "sveltekit-adapter-versioned-worker/worker";
import { modifyRequestHeaders } from "sveltekit-adapter-versioned-worker/worker/util";

const CHUNK_SIZE = 250_000;

export const handleFetch = virtualRoutes({
	"/testVideo.mp4": async ({ request, event }) => {
		const originalRangeValue = request.headers.get("range");
		if (originalRangeValue == null) return;

		const [rangeType, rangeValue] = originalRangeValue.split("=").map(value => value.trim());
		if (rangeType !== "bytes" || rangeValue === "") return;

		// TODO: handle commas
		const [rangeStart, rangeEnd] : (number | null)[] = rangeValue.split("-").map(value => {
			const parsed = parseInt(value);

			return isNaN(parsed)? null : parsed;
		});

		const isExactRange = rangeStart == null || rangeEnd != null;
		
		const newRequest = isExactRange? request : modifyRequestHeaders(request, {
			range: `bytes=${rangeStart}-${rangeStart + CHUNK_SIZE}`
		}, {
			mode: "cors"
		});

		const res = await fetch(newRequest);

		event.waitUntil((async () => {
			// TODO
		})());
		return res;
	}
});