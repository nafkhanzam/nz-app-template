<script lang="ts">
  import { uploadFile, getFileUrl } from "$lib";
  import { client } from "$lib/client.svelte";
  import Query from "$lib/components/Query.svelte";
  import { user } from "$lib/stores/user.svelte";
  import {toast} from "$lib";
  import Container from "$lib/components/Container.svelte";

  const postsQ = client.post.useFindMany(() => ({
    where: {},
    include: {
      User: true,
      Image: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  }));

  let postContent = $state("");
  let postImage: File | null = $state(null);
  let isSubmitting = $state(false);

  const postCreateQ = client.post.useCreate();

  const onPostSubmit = async () => {
    if (!postContent.trim()) {
      toast.error("Post content is required");
      return;
    }

    isSubmitting = true;
    try {
      let imageKey: string | undefined;

      // Upload image if provided
      if (postImage) {
        const result = await uploadFile({
          file: postImage,
          prefix: "posts",
        });
        imageKey = result.key;
      }

      // Create post
      await postCreateQ.mutateAsync({
        data: {
          userId: user().id,
          content: postContent,
          imageKey,
        },
      });

      // Reset form
      postContent = "";
      postImage = null;

      toast.success("Post created successfully!");
      postsQ.refetch();
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post");
    } finally {
      isSubmitting = false;
    }
  };

  const handleFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      postImage = target.files[0];
    }
  };
</script>

<Container>
  <div class="card bg-base-100 shadow-xl my-4">
    <div class="card-body">
      <h2 class="card-title">Create a Post</h2>
      <textarea
        class="textarea textarea-bordered w-full"
        placeholder="What's on your mind?"
        bind:value={postContent}
        rows="3"
      ></textarea>

      <div class="form-control">
        <label class="label">
          <span class="label-text">Add an image (optional)</span>
        </label>
        <input
          type="file"
          class="file-input file-input-bordered w-full"
          accept="image/*"
          onchange={handleFileChange}
        />
        {#if postImage}
          <label class="label">
            <span class="label-text-alt">Selected: {postImage.name}</span>
          </label>
        {/if}
      </div>

      <div class="card-actions justify-end">
        <button
          class="btn btn-primary"
          onclick={onPostSubmit}
          disabled={isSubmitting || !postContent.trim()}
        >
          {isSubmitting ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  </div>

  <Query q={postsQ}>
    {#snippet children(data)}
      <div class="space-y-4">
        <h2 class="text-2xl font-bold">Posts</h2>
        {#if data.length === 0}
          <div class="alert">
            <span>No posts yet. Be the first to post!</span>
          </div>
        {:else}
          {#each data as post}
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <div class="flex items-center gap-2 mb-2">
                  <span class="font-semibold">{post.User.name}</span>
                  <span class="text-sm text-gray-500">
                    @{post.User.username}
                  </span>
                  <span class="text-sm text-gray-400">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p class="whitespace-pre-wrap">{post.content}</p>
                {#if post.Image}
                  <figure class="mt-4">
                    <img
                      src={getFileUrl(post.Image.key)}
                      alt="Post"
                      class="rounded-lg max-w-2xl h-auto"
                    />
                  </figure>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    {/snippet}
  </Query>
</Container>
