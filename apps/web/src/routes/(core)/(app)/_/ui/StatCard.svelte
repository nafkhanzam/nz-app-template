<script lang="ts">
  import Icon from "@iconify/svelte";

  interface Props {
    icon: string;
    title: string;
    value: string | number;
    description?: string;
    color?: "primary" | "secondary" | "accent" | "info" | "success" | "warning" | "error";
  }

  let { icon, title, value, description, color = "primary" }: Props = $props();
</script>

<div class="stat">
  <div class="stat-figure text-{color}">
    <Icon {icon} class="h-8 w-8" />
  </div>
  <div class="stat-title">{title}</div>
  <div class="stat-value text-{color}">{value}</div>
  {#if description}
    <div class="stat-desc">{description}</div>
  {/if}
</div>
