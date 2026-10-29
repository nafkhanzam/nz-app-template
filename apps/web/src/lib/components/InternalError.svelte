<script lang="ts">
  const { statusCode, message }: { statusCode: number; message: string } = $props();
</script>

<div class="-mt-16 flex min-h-screen flex-col items-center justify-center">
  <span class="text-[96px] font-black">{statusCode}</span>
  <span class="mt-2 text-4xl">{message}</span>
  <a href={`/`} class="btn-special btn mt-10 btn-wide text-xl"
    ><i class="fa fa-arrow-left"></i>Back to Home</a
  >
</div>
