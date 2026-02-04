<script>
  import {page} from "$app/state";
  import {toast} from "$lib";
  import InternalError from "$lib/components/InternalError.svelte";

  $effect(() => {
    const message = page.error?.message;
    if (message) {
      toast.error(message);
    }
  });
</script>

<InternalError statusCode={page.status} message={page.error?.message ?? `Unknown Error`} />
