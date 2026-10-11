import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // SPA estática: o mesmo build é servido pela Cloudflare e pelo servidor local (base sempre "/").
    adapter: adapter({ fallback: "index.html" }),
  },
};
