<script lang="ts">
  import Icon from "@iconify/svelte";
  import jsQR from "jsqr";

  interface ScanResult {
    ok: boolean;
    message: string;
  }

  interface Props {
    // Called with the decoded QR text; resolves to a message to show.
    onScan: (value: string) => Promise<ScanResult>;
    title?: string;
  }

  let { onScan, title = "Scan QR code" }: Props = $props();

  const RESCAN_DELAY_MS = 3000;
  const POPUP_MS = 2500;

  let dialog = $state<HTMLDialogElement>();
  let video = $state<HTMLVideoElement>();
  let open = $state(false);
  let cameraError = $state<string | null>(null);
  let last = $state<ScanResult | null>(null);
  let popupTimer: ReturnType<typeof setTimeout> | undefined;

  function showResult(result: ScanResult) {
    last = result;
    clearTimeout(popupTimer);
    popupTimer = setTimeout(() => (last = null), POPUP_MS);
  }

  export function show() {
    open = true;
    dialog?.showModal();
  }

  $effect(() => {
    if (!open || !video) return;
    const videoEl = video;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    let busy = false;
    let lastValue = "";
    let lastAt = 0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    async function tick() {
      if (stopped) return;
      if (!busy && ctx && videoEl.readyState >= videoEl.HAVE_CURRENT_DATA && videoEl.videoWidth) {
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        ctx.drawImage(videoEl, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height);
        const now = Date.now();
        if (code?.data && (code.data !== lastValue || now - lastAt > RESCAN_DELAY_MS)) {
          lastValue = code.data;
          lastAt = now;
          busy = true;
          try {
            showResult(await onScan(code.data));
          } catch (error) {
            console.error("Error handling scanned QR:", error);
            showResult({ ok: false, message: "Failed to handle scan." });
          } finally {
            busy = false;
          }
        }
      }
      raf = requestAnimationFrame(() => void tick());
    }

    cameraError = null;
    last = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        videoEl.srcObject = s;
        void videoEl.play();
        void tick();
      })
      .catch(() => {
        cameraError = "Camera access is required to scan QR codes.";
      });

    return () => {
      stopped = true;
      clearTimeout(popupTimer);
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      videoEl.srcObject = null;
    };
  });
</script>

<dialog bind:this={dialog} class="modal" onclose={() => (open = false)}>
  <div class="modal-box flex flex-col gap-3">
    <h3 class="text-lg font-bold">{title}</h3>
    {#if cameraError}
      <div class="alert alert-error">
        <Icon icon="heroicons:video-camera-slash" class="h-5 w-5" />
        <span>{cameraError}</span>
      </div>
    {:else}
      <!-- svelte-ignore a11y_media_has_caption -->
      <div class="relative">
        <video bind:this={video} class="w-full rounded bg-black" playsinline muted></video>
        {#if last}
          <div class="absolute inset-0 flex items-center justify-center p-4">
            <div
              class="alert flex-col text-center shadow-xl"
              class:alert-success={last.ok}
              class:alert-warning={!last.ok}
              role="status"
            >
              <Icon
                icon={last.ok ? "heroicons:check-circle" : "heroicons:exclamation-triangle"}
                class="h-10 w-10"
              />
              <span class="text-lg font-semibold">{last.message}</span>
            </div>
          </div>
        {/if}
      </div>
    {/if}
    <div class="modal-action">
      <form method="dialog">
        <button class="btn">Close</button>
      </form>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop"><button>close</button></form>
</dialog>
