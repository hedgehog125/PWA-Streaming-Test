<script lang="ts">
	import { link } from "sveltekit-adapter-versioned-worker/svelte/util";
</script>

<!-- svelte-ignore a11y-media-has-caption -->
<span>Credit: </span> <a href="https://www.bigbuckbunny.org/">Big Buck Bunny</a> <br>
<video muted controls>
	<source src={link("testVideo.mp4")} type="video/mp4">
</video>