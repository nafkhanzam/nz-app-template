<script lang="ts">
  import Icon from "@iconify/svelte";

  interface Props {
    type?: "info" | "success" | "warning" | "error";
    title?: string;
    message?: string;
    children?: import("svelte").Snippet;
  }

  let { type = "info", title, message, children }: Props = $props();

  const alertClass = {
    info: "alert-info",
    success: "alert-success",
    warning: "alert-warning",
    error: "alert-error",
  }[type];

  const iconName = {
    info: "heroicons:information-circle",
    success: "heroicons:check-circle",
    warning: "heroicons:exclamation-triangle",
    error: "heroicons:x-circle",
  }[type];
</script>

<div class="alert {alertClass} shadow-lg">
  <Icon icon={iconName} class="h-6 w-6 shrink-0" />
  {#if children}
    {@render children()}
  {:else}
    <div>
      {#if title}
        <h3 class="font-bold">{title}</h3>
      {/if}
      {#if message}
        <p class="text-sm">{message}</p>
      {/if}
    </div>
  {/if}
</div>
