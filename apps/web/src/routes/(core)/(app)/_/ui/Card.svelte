<script lang="ts">
  interface Props {
    title?: string;
    class?: string;
    bordered?: boolean;
    hover?: boolean;
    children: import("svelte").Snippet;
  }

  let { title, class: className = "", bordered = false, hover = false, children }: Props = $props();

  const borderClass = bordered ? "border-2 border-base-300" : "";
  const hoverClass = hover ? "transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl" : "";
</script>

<div class="card bg-base-100 shadow-xl {borderClass} {hoverClass} {className}">
  <div class="card-body p-4">
    {#if title}
      <h2 class="card-title text-base">{title}</h2>
      <div class="divider my-2"></div>
    {/if}
    {@render children()}
  </div>
</div>
