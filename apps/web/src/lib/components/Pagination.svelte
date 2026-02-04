<script lang="ts">
  import Icon from "@iconify/svelte";

  interface Props {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange?: (itemsPerPage: number) => void;
  }

  let {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
  }: Props = $props();

  const itemsPerPageOptions = [10, 25, 50, 100];

  function getVisiblePages(current: number, total: number): (number | "...")[] {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 3) {
      return [1, 2, 3, 4, 5, "...", total];
    }

    if (current >= total - 2) {
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, "...", current - 1, current, current + 1, "...", total];
  }

  const startItem = $derived((currentPage - 1) * itemsPerPage + 1);
  const endItem = $derived(Math.min(currentPage * itemsPerPage, totalItems));
  const visiblePages = $derived(getVisiblePages(currentPage, totalPages));
</script>

{#if totalPages > 0}
  <div class="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
    <!-- Items per page selector -->
    <div class="flex items-center gap-2 text-sm">
      <span class="text-base-content/70">Show</span>
      <select
        class="select select-bordered select-sm w-20"
        value={itemsPerPage}
        onchange={(e) => onItemsPerPageChange?.(Number(e.currentTarget.value))}
      >
        {#each itemsPerPageOptions as option (option)}
          <option value={option}>{option}</option>
        {/each}
      </select>
      <span class="text-base-content/70">entries</span>
    </div>

    <!-- Pagination info and controls -->
    <div class="flex items-center gap-4">
      <span class="text-sm text-base-content/70">
        Showing {startItem} to {endItem} of {totalItems} entries
      </span>

      <div class="join">
        <!-- Previous button -->
        <button
          class="btn btn-sm join-item"
          disabled={currentPage === 1}
          onclick={() => onPageChange(currentPage - 1)}
        >
          <Icon icon="heroicons:chevron-left" class="h-4 w-4" />
        </button>

        <!-- Page numbers -->
        {#each visiblePages as page, index (index)}
          {#if page === "..."}
            <button class="btn btn-sm join-item btn-disabled">...</button>
          {:else}
            <button
              class="btn btn-sm join-item {currentPage === page ? 'btn-primary' : ''}"
              onclick={() => onPageChange(page)}
            >
              {page}
            </button>
          {/if}
        {/each}

        <!-- Next button -->
        <button
          class="btn btn-sm join-item"
          disabled={currentPage === totalPages}
          onclick={() => onPageChange(currentPage + 1)}
        >
          <Icon icon="heroicons:chevron-right" class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
{/if}
