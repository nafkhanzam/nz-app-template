import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import { modalStore } from "#lib/stores/modal.svelte";

export const confirmLogout = async () => {
  const confirmed = await modalStore.confirm({
    title: "Logout",
    message: "Are you sure you want to log out?",
    confirmLabel: "Logout",
    confirmClass: "btn-error",
  });
  if (confirmed) await goto(resolve("logout/"));
};
