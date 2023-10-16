(async () => {
	const cache = await caches.open("VersionedWorkerCache_Media");
	const keys = await cache.keys();
	
	let totalBytes = 0;
	await Promise.all(keys.map(async req => {
		const res = await cache.match(req);

		const len = (await res.arrayBuffer()).byteLength;
		console.log(req.url, len);
		totalBytes += len;
	}));
	console.log(totalBytes);
})();