<script lang="ts">
  import Icon from "@iconify/svelte";

  interface Props {
    title: string;
    url: string;
  }

  let { title, url }: Props = $props();
</script>

<a
  href={url}
  target="_blank"
  rel="noopener noreferrer"
  class="card bg-base-100 shadow-xl transition-shadow hover:shadow-2xl"
>
  <div class="card-body">
    <div class="flex items-start justify-between gap-2">
      <h3 class="card-title text-base">{title}</h3>
      <Icon
        icon="heroicons:arrow-top-right-on-square"
        class="h-5 w-5 shrink-0"
      />
    </div>
    <p class="line-clamp-1 text-sm text-base-content/70">{url}</p>
  </div>
</a>
