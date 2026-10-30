<script lang="ts">
  import PageTitle from "../../_/PageTitle.svelte";
  import { resolve } from "$app/paths";
  import Container from "#lib/components/Container.svelte";
</script>

<PageTitle title="Home" />

<Container>
  <a href={resolve("posts/")} class="btn btn-link">Go to /posts</a>
</Container>
