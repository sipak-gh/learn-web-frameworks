import { component$, useSignal } from "@builder.io/qwik";

// Module scope: every segment that uses it imports it instead of capturing it,
// so nothing about it has to be serialized.
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const Price = component$(() => {
  const cents = useSignal(1999);
  const label = useSignal(money.format(cents.value / 100));

  return (
    <button
      type="button"
      onClick$={() => {
        cents.value *= 2;
        label.value = money.format(cents.value / 100);
      }}
    >
      {label.value}
    </button>
  );
});
