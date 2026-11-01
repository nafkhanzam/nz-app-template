<script lang="ts">
  import Icon from "@iconify/svelte";
  import PageTitle from "../../../_/PageTitle.svelte";
  import { client } from "#lib/client.svelte";
  import { getFileUrl, toast, uploadFile } from "#lib";
  import Container from "#lib/components/Container.svelte";
  import Query from "#lib/components/Query.svelte";
  import Pagination from "#lib/components/Pagination.svelte";
  import MarkdownEditor from "#lib/components/MarkdownEditor.svelte";
  import Markdown from "#lib/components/Markdown.svelte";
  import { usePagination } from "#lib/stores/pagination.svelte";
  import { user } from "#lib/stores/user.svelte";
  import { modalStore } from "#lib/stores/modal.svelte";
  import { formatDateTime } from "#lib/date-format";
  import {
    reportStatusBadgeClass,
    reportStatusOptions,
    reportTypeBadgeClass,
    reportTypeIcon,
    reportTypeOptions,
  } from "#lib/report";
  import type { ReportStatus, ReportType } from "#lib/zenstack/models";

  const isAdmin = $derived(user().role === "ADMIN");
  const pagination = usePagination(10);

  let statusFilter = $state<ReportStatus | "">("");
  let typeFilter = $state<ReportType | "">("");

  const adminWhere = $derived({
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
  });

  const allReportsQ = client.report.useFindMany(
    () => ({
      where: adminWhere,
      include: { User: true, File: true, RespondedBy: true },
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    () => ({ enabled: isAdmin }),
  );
  const allReportsCountQ = client.report.useCount(
    () => ({ where: adminWhere }),
    () => ({ enabled: isAdmin }),
  );

  const myReportsQ = client.report.useFindMany(
    () => ({
      where: { userId: user().id },
      include: { User: true, File: true, RespondedBy: true },
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    () => ({ enabled: !isAdmin }),
  );
  const myReportsCountQ = client.report.useCount(
    () => ({ where: { userId: user().id } }),
    () => ({ enabled: !isAdmin }),
  );

  // Create form (any user, incl. admin)
  let isCreating = $state(false);
  let formType = $state<ReportType>("BUG");
  let formTitle = $state("");
  let formDescription = $state("");
  let formFileKey = $state<string | null>(null);
  let formFileName = $state<string | null>(null);
  let isUploading = $state(false);
  let isSaving = $state(false);
  let fileInput = $state<HTMLInputElement | undefined>();

  const reportCreateQ = client.report.useCreate();
  const reportUpdateQ = client.report.useUpdate();
  const reportDeleteQ = client.report.useDelete();

  function resetForm() {
    formType = "BUG";
    formTitle = "";
    formDescription = "";
    formFileKey = null;
    formFileName = null;
    if (fileInput) fileInput.value = "";
  }

  const startCreate = () => {
    resetForm();
    isCreating = true;
  };

  const cancelCreate = () => {
    isCreating = false;
    resetForm();
  };

  const onFileSelected = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    isUploading = true;
    try {
      const { key } = await uploadFile({ file, prefix: "reports" });
      formFileKey = key;
      formFileName = file.name;
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload attachment");
    } finally {
      isUploading = false;
    }
  };

  const onRemoveFile = () => {
    formFileKey = null;
    formFileName = null;
    if (fileInput) fileInput.value = "";
  };

  const refetchLists = () => {
    allReportsQ.refetch();
    allReportsCountQ.refetch();
    myReportsQ.refetch();
    myReportsCountQ.refetch();
  };

  const onCreate = async () => {
    if (!formTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    isSaving = true;
    try {
      await reportCreateQ.mutateAsync({
        data: {
          userId: user().id,
          type: formType,
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          fileKey: formFileKey,
        },
      });
      toast.success("Report submitted");
      cancelCreate();
      refetchLists();
    } catch (error) {
      console.error("Error creating report:", error);
      toast.error("Failed to submit report");
    } finally {
      isSaving = false;
    }
  };

  // Edit own report (only while OPEN)
  let editingId = $state<string | null>(null);

  const startEdit = (report: { id: string; type: string; title: string; description: string | null; fileKey: string | null; File: { originalFilename: string } | null }) => {
    editingId = report.id;
    formType = report.type as ReportType;
    formTitle = report.title;
    formDescription = report.description ?? "";
    formFileKey = report.fileKey;
    formFileName = report.File?.originalFilename ?? null;
  };

  const cancelEdit = () => {
    editingId = null;
    resetForm();
  };

  const onSaveEdit = async () => {
    if (!editingId || !formTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    isSaving = true;
    try {
      await reportUpdateQ.mutateAsync({
        where: { id: editingId },
        data: {
          type: formType,
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          fileKey: formFileKey,
        },
      });
      toast.success("Report updated");
      cancelEdit();
      refetchLists();
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Failed to update report");
    } finally {
      isSaving = false;
    }
  };

  let deletingId = $state<string | null>(null);

  const onDelete = async (id: string) => {
    const confirmed = await modalStore.confirm({
      title: "Delete report",
      message: "Delete this report?",
      confirmLabel: "Delete",
      confirmClass: "btn-error",
    });
    if (!confirmed) return;
    deletingId = id;
    try {
      await reportDeleteQ.mutateAsync({ where: { id } });
      toast.success("Report deleted");
      refetchLists();
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error("Failed to delete report");
    } finally {
      deletingId = null;
    }
  };

  let statusUpdatingId = $state<string | null>(null);

  const onChangeStatus = async (id: string, status: ReportStatus) => {
    statusUpdatingId = id;
    try {
      await reportUpdateQ.mutateAsync({ where: { id }, data: { status } });
      toast.success("Status updated");
      allReportsQ.refetch();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      statusUpdatingId = null;
    }
  };

  let respondingId = $state<string | null>(null);
  let responseDraft = $state("");
  let isResponding = $state(false);

  const startRespond = (report: { id: string; response: string | null }) => {
    respondingId = report.id;
    responseDraft = report.response ?? "";
  };

  const cancelRespond = () => {
    respondingId = null;
    responseDraft = "";
  };

  const onSaveResponse = async () => {
    if (!respondingId) return;
    const response = responseDraft.trim();
    isResponding = true;
    try {
      await reportUpdateQ.mutateAsync({
        where: { id: respondingId },
        data: response
          ? { response, respondedAt: new Date(), respondedById: user().id }
          : { response: null, respondedAt: null, respondedById: null },
      });
      toast.success("Response saved");
      cancelRespond();
      allReportsQ.refetch();
    } catch (error) {
      console.error("Error saving response:", error);
      toast.error("Failed to save response");
    } finally {
      isResponding = false;
    }
  };
</script>

{#snippet responseBlock(report: { response: string | null; respondedAt: Date | null; RespondedBy?: { name: string } | null })}
  {#if report.response}
    <div class="rounded-lg border-l-4 border-primary bg-base-200 p-3 text-sm">
      <div class="mb-1 flex items-center gap-1 text-xs font-semibold text-primary">
        <Icon icon="heroicons:chat-bubble-left-ellipsis" class="h-3.5 w-3.5" />
        Admin response{report.RespondedBy ? ` · ${report.RespondedBy.name}` : ""}
        {#if report.respondedAt}
          <span class="font-normal text-base-content/50">· {formatDateTime(report.respondedAt)}</span>
        {/if}
      </div>
      <Markdown content={report.response} />
    </div>
  {/if}
{/snippet}

<PageTitle title="Reports" />

<Container>
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <h2 class="flex items-center gap-2 text-2xl font-bold">
      <Icon icon="heroicons:bug-ant" class="h-7 w-7" />
      {isAdmin ? "Bug Reports & Feedback" : "Report a Bug / Feedback"}
    </h2>
    {#if !isCreating}
      <button class="btn btn-primary gap-2" onclick={startCreate}>
        <Icon icon="heroicons:plus" class="h-4 w-4" />
        New Report
      </button>
    {/if}
  </div>

  {#if isCreating}
    <div class="card mb-6 bg-base-100 shadow-sm">
      <div class="card-body gap-3">
        <div class="flex gap-2">
          {#each reportTypeOptions as opt (opt)}
            <button
              type="button"
              class="btn btn-sm {formType === opt ? 'btn-primary' : 'btn-outline'}"
              onclick={() => (formType = opt)}
              disabled={isSaving}
            >
              <Icon icon={reportTypeIcon(opt)} class="h-4 w-4" />
              {opt === "BUG" ? "Bug" : "Feedback"}
            </button>
          {/each}
        </div>
        <input
          type="text"
          class="input input-bordered w-full"
          placeholder="Short summary"
          bind:value={formTitle}
          disabled={isSaving}
        />
        <div>
          <p class="label-text mb-1">
            Description <span class="text-base-content/40"
              >(steps to reproduce, expected vs actual behavior, or your feedback...)</span
            >
          </p>
          <MarkdownEditor bind:value={formDescription} minHeight="8rem" readOnly={isSaving} />
        </div>
        <div>
          <p class="label-text mb-1">Attachment (optional)</p>
          {#if formFileKey}
            <div class="flex items-center gap-2 rounded-lg border border-base-300 p-3">
              <Icon icon="heroicons:paper-clip" class="h-4 w-4 shrink-0" />
              <a
                href={getFileUrl(formFileKey)}
                target="_blank"
                rel="noopener noreferrer"
                class="link flex-1 truncate"
              >
                {formFileName ?? "Attachment"}
              </a>
              <button class="btn btn-ghost btn-xs text-error" onclick={onRemoveFile} disabled={isSaving}>
                <Icon icon="heroicons:x-mark" class="h-4 w-4" />
              </button>
            </div>
          {:else}
            <input
              bind:this={fileInput}
              type="file"
              class="file-input file-input-bordered w-full"
              onchange={onFileSelected}
              disabled={isUploading || isSaving}
            />
          {/if}
          {#if isUploading}
            <span class="mt-1 flex items-center gap-1 text-sm text-base-content/60">
              <span class="loading loading-spinner loading-xs"></span>
              Uploading...
            </span>
          {/if}
        </div>
        <div class="card-actions justify-end">
          <button class="btn btn-ghost" onclick={cancelCreate} disabled={isSaving}>Cancel</button>
          <button
            class="btn btn-primary"
            onclick={onCreate}
            disabled={isSaving || isUploading || !formTitle.trim()}
          >
            {isSaving ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if isAdmin}
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <select class="select select-bordered select-sm" bind:value={typeFilter}>
        <option value="">All types</option>
        {#each reportTypeOptions as opt (opt)}
          <option value={opt}>{opt === "BUG" ? "Bug" : "Feedback"}</option>
        {/each}
      </select>
      <select class="select select-bordered select-sm" bind:value={statusFilter}>
        <option value="">All statuses</option>
        {#each reportStatusOptions as opt (opt)}
          <option value={opt}>{opt.replace("_", " ")}</option>
        {/each}
      </select>
    </div>

    <Query q={allReportsQ}>
      {#snippet children(reports)}
        {#if reports.length === 0}
          <div class="alert">
            <Icon icon="heroicons:inbox" class="h-5 w-5" />
            <span>No reports match the current filters.</span>
          </div>
        {:else}
          <div class="space-y-3">
            {#each reports as report (report.id)}
              <div class="card bg-base-100 shadow-sm">
                <div class="card-body gap-2">
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <span class="badge {reportTypeBadgeClass(report.type)} gap-1">
                        <Icon icon={reportTypeIcon(report.type)} class="h-3.5 w-3.5" />
                        {report.type}
                      </span>
                      <h3 class="text-base font-semibold break-all">{report.title}</h3>
                    </div>
                    <div class="flex items-center gap-2">
                      <select
                        class="select select-bordered select-xs"
                        value={report.status}
                        disabled={statusUpdatingId === report.id}
                        onchange={(e) => onChangeStatus(report.id, e.currentTarget.value as ReportStatus)}
                      >
                        {#each reportStatusOptions as opt (opt)}
                          <option value={opt}>{opt.replace("_", " ")}</option>
                        {/each}
                      </select>
                      <button
                        class="btn btn-ghost btn-xs text-error"
                        onclick={() => onDelete(report.id)}
                        disabled={deletingId === report.id}
                      >
                        {#if deletingId === report.id}
                          <span class="loading loading-spinner loading-xs"></span>
                        {:else}
                          <Icon icon="heroicons:trash" class="h-4 w-4" />
                        {/if}
                      </button>
                    </div>
                  </div>
                  {#if report.description}
                    <div class="text-sm">
                      <Markdown content={report.description} />
                    </div>
                  {/if}
                  {#if report.File}
                    <a
                      href={getFileUrl(report.File.key)}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="link link-hover flex w-fit items-center gap-1 text-xs"
                    >
                      <Icon icon="heroicons:paper-clip" class="h-3.5 w-3.5" />
                      {report.File.originalFilename}
                    </a>
                  {/if}
                  {#if respondingId === report.id}
                    <div class="space-y-2">
                      <MarkdownEditor bind:value={responseDraft} minHeight="6rem" readOnly={isResponding} />
                      <div class="flex justify-end gap-2">
                        <button class="btn btn-ghost btn-sm" onclick={cancelRespond} disabled={isResponding}>Cancel</button>
                        <button class="btn btn-primary btn-sm" onclick={onSaveResponse} disabled={isResponding}>
                          {isResponding ? "Saving..." : "Save response"}
                        </button>
                      </div>
                    </div>
                  {:else}
                    {@render responseBlock(report)}
                    <button class="btn btn-outline btn-xs w-fit gap-1" onclick={() => startRespond(report)}>
                      <Icon icon="heroicons:chat-bubble-left-ellipsis" class="h-3.5 w-3.5" />
                      {report.response ? "Edit response" : "Respond"}
                    </button>
                  {/if}
                  <div class="flex items-center justify-between text-xs text-base-content/40">
                    <span>{report.User.name} <span class="text-base-content/60">@{report.User.username}</span></span>
                    <span>{formatDateTime(report.createdAt)}</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
        <Pagination pagination={pagination} totalItems={allReportsCountQ.data ?? 0} pageSizeOptions={[10, 20, 50]} />
      {/snippet}
    </Query>
  {:else}
    <Query q={myReportsQ}>
      {#snippet children(reports)}
        {#if reports.length === 0}
          <div class="alert">
            <Icon icon="heroicons:inbox" class="h-5 w-5" />
            <span>You haven't submitted any reports yet.</span>
          </div>
        {:else}
          <div class="space-y-3">
            {#each reports as report (report.id)}
              <div class="card bg-base-100 shadow-sm">
                <div class="card-body gap-2">
                  {#if editingId === report.id}
                    <div class="flex gap-2">
                      {#each reportTypeOptions as opt (opt)}
                        <button
                          type="button"
                          class="btn btn-sm {formType === opt ? 'btn-primary' : 'btn-outline'}"
                          onclick={() => (formType = opt)}
                          disabled={isSaving}
                        >
                          <Icon icon={reportTypeIcon(opt)} class="h-4 w-4" />
                          {opt === "BUG" ? "Bug" : "Feedback"}
                        </button>
                      {/each}
                    </div>
                    <input
                      type="text"
                      class="input input-bordered w-full"
                      bind:value={formTitle}
                      disabled={isSaving}
                    />
                    <MarkdownEditor bind:value={formDescription} minHeight="8rem" readOnly={isSaving} />
                    <div>
                      {#if formFileKey}
                        <div class="flex items-center gap-2 rounded-lg border border-base-300 p-3">
                          <Icon icon="heroicons:paper-clip" class="h-4 w-4 shrink-0" />
                          <a
                            href={getFileUrl(formFileKey)}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="link flex-1 truncate"
                          >
                            {formFileName ?? "Attachment"}
                          </a>
                          <button
                            class="btn btn-ghost btn-xs text-error"
                            onclick={onRemoveFile}
                            disabled={isSaving}
                          >
                            <Icon icon="heroicons:x-mark" class="h-4 w-4" />
                          </button>
                        </div>
                      {:else}
                        <input
                          bind:this={fileInput}
                          type="file"
                          class="file-input file-input-bordered w-full"
                          onchange={onFileSelected}
                          disabled={isUploading || isSaving}
                        />
                      {/if}
                      {#if isUploading}
                        <span class="mt-1 flex items-center gap-1 text-sm text-base-content/60">
                          <span class="loading loading-spinner loading-xs"></span>
                          Uploading...
                        </span>
                      {/if}
                    </div>
                    <div class="card-actions justify-end">
                      <button class="btn btn-ghost btn-sm" onclick={cancelEdit} disabled={isSaving}
                        >Cancel</button
                      >
                      <button
                        class="btn btn-primary btn-sm"
                        onclick={onSaveEdit}
                        disabled={isSaving || isUploading || !formTitle.trim()}
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  {:else}
                    <div class="flex flex-wrap items-start justify-between gap-2">
                      <div class="flex items-center gap-2">
                        <span class="badge {reportTypeBadgeClass(report.type)} gap-1">
                          <Icon icon={reportTypeIcon(report.type)} class="h-3.5 w-3.5" />
                          {report.type}
                        </span>
                        <h3 class="text-base font-semibold break-all">{report.title}</h3>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="badge {reportStatusBadgeClass(report.status)}"
                          >{report.status.replace("_", " ")}</span
                        >
                        {#if report.status === "OPEN"}
                          <button class="btn btn-ghost btn-xs" onclick={() => startEdit(report)}>
                            <Icon icon="heroicons:pencil" class="h-4 w-4" />
                          </button>
                          <button
                            class="btn btn-ghost btn-xs text-error"
                            onclick={() => onDelete(report.id)}
                            disabled={deletingId === report.id}
                          >
                            {#if deletingId === report.id}
                              <span class="loading loading-spinner loading-xs"></span>
                            {:else}
                              <Icon icon="heroicons:trash" class="h-4 w-4" />
                            {/if}
                          </button>
                        {/if}
                      </div>
                    </div>
                    {#if report.description}
                      <div class="text-sm">
                        <Markdown content={report.description} />
                      </div>
                    {/if}
                    {#if report.File}
                      <a
                        href={getFileUrl(report.File.key)}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="link link-hover flex w-fit items-center gap-1 text-xs"
                      >
                        <Icon icon="heroicons:paper-clip" class="h-3.5 w-3.5" />
                        {report.File.originalFilename}
                      </a>
                    {/if}
                    {@render responseBlock(report)}
                    <div class="flex items-center justify-between text-xs text-base-content/40">
                      <span>{report.User.name} <span class="text-base-content/60">@{report.User.username}</span></span>
                      <span>{formatDateTime(report.createdAt)}</span>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
        <Pagination pagination={pagination} totalItems={myReportsCountQ.data ?? 0} pageSizeOptions={[10, 20, 50]} />
      {/snippet}
    </Query>
  {/if}
</Container>
