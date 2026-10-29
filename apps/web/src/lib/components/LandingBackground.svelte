<script lang="ts">
  import Icon from "@iconify/svelte";
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();

  // Faint study-themed doodles scattered over the background
  const doodles = [
    { icon: "mdi:school-outline", top: 6, left: 5, size: 88, rotate: -12 },
    { icon: "mdi:book-open-page-variant-outline", top: 12, left: 44, size: 72, rotate: 8 },
    { icon: "mdi:lightbulb-on-outline", top: 8, left: 86, size: 80, rotate: 14 },
    { icon: "mdi:atom", top: 34, left: 2, size: 76, rotate: 0 },
    { icon: "mdi:calculator-variant-outline", top: 46, left: 92, size: 68, rotate: -10 },
    { icon: "mdi:flask-outline", top: 66, left: 6, size: 84, rotate: 10 },
    { icon: "mdi:pencil-ruler-outline", top: 84, left: 38, size: 72, rotate: -8 },
    { icon: "mdi:earth", top: 80, left: 78, size: 92, rotate: 6 },
    { icon: "mdi:certificate-outline", top: 62, left: 52, size: 64, rotate: -14 },
    { icon: "mdi:beaker-outline", top: 26, left: 66, size: 56, rotate: 12 },
  ];
</script>

<!-- Shared backdrop for the login page and the maintenance gate -->
<div
  class="relative flex min-h-screen flex-col overflow-hidden bg-base-300 [--color-accent-content:#fff] [--color-accent:#a855f7] [--color-primary-content:#fff] [--color-primary:#6366f1] [--color-secondary-content:#042f3a] [--color-secondary:#22d3ee]"
>
  <div class="pointer-events-none absolute inset-0" aria-hidden="true">
    <!-- Notebook grid -->
    <div
      class="absolute inset-0 bg-[linear-gradient(color-mix(in_oklab,var(--color-base-content)_7%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,var(--color-base-content)_7%,transparent)_1px,transparent_1px)] bg-size-[32px_32px] mask-[radial-gradient(ellipse_at_center,black_20%,transparent_80%)]"
    ></div>
    {#each doodles as d (d.icon)}
      <span
        class="absolute hidden text-base-content/10 sm:block"
        style="top:{d.top}%;left:{d.left}%;transform:rotate({d.rotate}deg)"
      >
        <Icon icon={d.icon} width={d.size} height={d.size} />
      </span>
    {/each}
    <div class="absolute -top-40 -left-32 h-136 w-136 rounded-full bg-primary/30 blur-3xl"></div>
    <div
      class="absolute -right-32 -bottom-40 h-136 w-136 rounded-full bg-secondary/25 blur-3xl"
    ></div>
    <div
      class="absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl"
    ></div>
    <div
      class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(0_0_0/0.18)_100%)]"
    ></div>
  </div>

  {@render children()}
</div>
