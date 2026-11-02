import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { App } from "../components/app";

export default component$(() => <App />);

export const head: DocumentHead = {
  title: "Tasklet — Qwik",
};
