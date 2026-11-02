// Server-renders one component the way Qwik's dev server does: Vite loads
// the file through the Qwik plugin (which runs the optimizer), and Qwik's
// server renderer turns it into HTML plus the serialized state.
// Usage: node render.mjs <file.tsx> <ExportName>
import { createServer } from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";

const [file, exportName] = process.argv.slice(2);
const vite = await createServer({
  configFile: false,
  root: import.meta.dirname,
  logLevel: "error",
  appType: "custom",
  server: { middlewareMode: true },
  optimizeDeps: { noDiscovery: true },
  plugins: [
    qwikVite({
      srcDir: import.meta.dirname,
      // The plugin checks its entry points exist; this file is both.
      client: { input: file },
      ssr: { input: file },
      devTools: { clickToSource: false },
    }),
  ],
});

try {
  const { jsx } = await vite.ssrLoadModule("@builder.io/qwik");
  const { renderToString } = await vite.ssrLoadModule("@builder.io/qwik/server");
  const component = (await vite.ssrLoadModule(`./${file}`))[exportName];
  const { html } = await renderToString(jsx(component, {}), {
    containerTagName: "div",
    qwikLoader: { include: "never" },
    // No client build ran, so name each lazy chunk after its symbol.
    symbolMapper: (symbol) => [symbol, `/build/${symbol}.js`],
  });
  console.log(html.replace(/></g, ">\n<"));
} catch (error) {
  console.log(`${error.name}: ${error.message}`);
} finally {
  await vite.close();
}
