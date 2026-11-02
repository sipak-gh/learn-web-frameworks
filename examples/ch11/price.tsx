import { component$, useSignal } from "@builder.io/qwik";

export const Price = component$(() => {
  const cents = useSignal(1999);
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
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
