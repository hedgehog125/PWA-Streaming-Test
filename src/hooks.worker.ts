import type { Nullable } from "sveltekit-adapter-versioned-worker/worker";

import { STORAGE_PREFIX, virtualRoutes } from "sveltekit-adapter-versioned-worker/worker";
import { modifyRequestHeaders } from "sveltekit-adapter-versioned-worker/worker/util";

const NETWORK_CHUNK_SIZE = 250_000;
const STORAGE_CHUNKS_PER_NETWORK_CHUNK = 5;
const STORAGE_CHUNK_SIZE = NETWORK_CHUNK_SIZE / STORAGE_CHUNKS_PER_NETWORK_CHUNK;

export const handleFetch = virtualRoutes({
	"/testVideo.mp4": async ({ request, event }) => {
		const originalRangeValue = request.headers.get("range");
		if (originalRangeValue == null) return;

		const [rangeType, rangeValue] = splitAndTrim(originalRangeValue, "=");
		if (rangeType !== "bytes" || rangeValue === "") return;

		// TODO: handle commas
		const splitByEquals = rangeValue.split("-");
		if (splitByEquals.length < 2) return;
		
		const [rangeStart, rangeEnd] = parseStrNumArray(splitByEquals);

		const isExactRange = rangeStart == null || rangeEnd != null;
		
		const newRequest = isExactRange? request : modifyRequestHeaders(request, {
			range: `bytes=${rangeStart}-${(rangeStart + NETWORK_CHUNK_SIZE) - 1}`
		}, { mode: "cors" });

		let res = await fetch(newRequest);
		if (res.status === 416) { // Range not satisfiable
			const contentLengthValue = res.headers.get("content-length");
			if (contentLengthValue == null) return; // Responses aren't required to have a content length

			const newRequest = modifyRequestHeaders(request, {
				range: `bytes=${rangeStart}-${parseInt(contentLengthValue) - 1}`
			}, { mode: "cors" });
			res = await fetch(newRequest);
		}

		event.waitUntil((async () => {
			if ((! res.ok) || res.body == null) return;
			const cloned = res.clone();

			const receivedRange = getReceivedRange(cloned);
			if (receivedRange == null) return;

			const [rangeStart, rangeEnd, outOf] = receivedRange;
			const saveFromChunk = Math.ceil(rangeStart / STORAGE_CHUNK_SIZE);
			const saveFromByte = saveFromChunk * STORAGE_CHUNK_SIZE;
			// +1 because rangeEnd is 0 indexed and inclusive
			/**
			 * @note This is exclusive
			 */
			const saveToChunk = Math.floor((rangeEnd + 1) / STORAGE_CHUNK_SIZE);
			/**
			 * @note This is exclusive
			 */
			const saveToByte = saveToChunk * STORAGE_CHUNK_SIZE;


			if (saveToByte - saveFromByte <= 0) return;

			const reader = cloned.body!.getReader(); // It'll have a body because the original had one
			const storedURLObj = new URL("/media", location.origin);
			storedURLObj.searchParams.set("url", request.url);
			storedURLObj.searchParams.set("chunk", saveFromChunk.toString());

			const storedRes = new Response(new ReadableStream({
				async start(controller) {
					while (true) {
						const { value } = await reader.read();
						if (value == null) break; // Stream ended
	
						controller.enqueue(value);
					}

					controller.close();
				},
			}));
			(await caches.open(`${STORAGE_PREFIX.slice(0, -1)}_Media`)).put(storedURLObj, storedRes);


			function getReceivedRange(res: Response): Nullable<[startInclusive: number, endInclusive: number, outOf: number]> {
				if (res.status !== 206) {
					const contentLengthValue = res.headers.get("content-length");
					if (contentLengthValue == null) return null; // Responses aren't required to have a content length

					const parsed = parseInt(contentLengthValue);
					return [0, parsed - 1, parsed];
				}

				const receivedRangeValue = cloned.headers.get("content-range");
				if (receivedRangeValue == null) return null; // Multipart byte ranges are complicated

				const firstSpaceIndex = receivedRangeValue.indexOf(" ");
				const rangeType = receivedRangeValue.slice(0, firstSpaceIndex);
				const outerRangeValue = receivedRangeValue.slice(firstSpaceIndex + 1).trim();
				if (rangeType !== "bytes" || outerRangeValue === "") return null;

				const { 0: innerRangeValue, 1: outOfValue, length: outerRangeLength } = splitAndTrim(outerRangeValue, "/");
				if (outerRangeLength !== 2) return null;

				const innerRange = splitAndTrim(innerRangeValue, "-");
				if (innerRange.length !== 2) return null;


				const [rangeStart, rangeEnd, outOf] = parseStrNumArray([...innerRange, outOfValue]);
				if (rangeStart == null || rangeEnd == null || outOf == null) return null;

				return [rangeStart, rangeEnd, outOf];
			}
		})());
		return res;
	}
});

function splitAndTrim(str: string, sep: string): string[] {
	return str.split(sep).map(value => value.trim());
}
function parseStrNumArray(arr: string[]): Nullable<number>[] {
	return arr.map(value => {
		const parsed = parseInt(value);

		return isNaN(parsed)? null : parsed;
	});
}