import { defineConfig } from "vite";

// `npm run preview` serves the static site in dist/ (written by the static
// adapter during `npm run build`) as a plain static host would: no Qwik
// plugins and no server-side rendering per request.
export default defineConfig({
  preview: { port: 4310, strictPort: true },
});
