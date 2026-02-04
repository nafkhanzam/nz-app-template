<script lang="ts">
  import { BKPStatus } from "$lib/zenstack/models";

  interface Props {
    status: BKPStatus | "draft" | "submitted" | "approved" | "rejected" | "pending" | "completed" | "in_progress";
    size?: "sm" | "md" | "lg";
  }

  let { status, size = "md" }: Props = $props();

  function getBadgeClass(status: Props["status"]): string {
    // Handle BKPStatus enum
    if (typeof status === "string") {
      switch (status as BKPStatus) {
        case BKPStatus.PROPOSAL:
          return "badge-neutral";
        case BKPStatus.WAITING_PROPOSAL_APPROVAL:
        case BKPStatus.WAITING_REGISTRATION_APPROVAL:
          return "badge-info";
        case BKPStatus.REGISTRATION:
        case BKPStatus.WEEKLY_REPORTING:
        case BKPStatus.UPLOADING_FIELD_ASSESSMENT:
          return "badge-warning";
        case BKPStatus.GRADING:
          return "badge-secondary";
        case BKPStatus.COMPLETED:
          return "badge-success";
        case BKPStatus.DELETED:
          return "badge-error";
      }
    }

    // Handle legacy status values
    const badges: Record<string, string> = {
      draft: "badge-neutral",
      submitted: "badge-info",
      approved: "badge-success",
      rejected: "badge-error",
      pending: "badge-warning",
      completed: "badge-success",
      in_progress: "badge-info",
    };
    return badges[status] || "badge-neutral";
  }

  function getStatusText(status: Props["status"]): string {
    // Handle BKPStatus enum
    if (typeof status === "string") {
      switch (status as BKPStatus) {
        case BKPStatus.PROPOSAL:
          return "Proposal";
        case BKPStatus.WAITING_PROPOSAL_APPROVAL:
          return "Pending Proposal Approval";
        case BKPStatus.REGISTRATION:
          return "Registration";
        case BKPStatus.WAITING_REGISTRATION_APPROVAL:
          return "Pending Registration Approval";
        case BKPStatus.WEEKLY_REPORTING:
          return "Weekly Reporting";
        case BKPStatus.UPLOADING_FIELD_ASSESSMENT:
          return "Field Assessment";
        case BKPStatus.GRADING:
          return "Grading";
        case BKPStatus.COMPLETED:
          return "Completed";
        case BKPStatus.DELETED:
          return "Deleted";
      }
    }

    // Handle legacy status values
    const texts: Record<string, string> = {
      draft: "Draft",
      submitted: "Submitted",
      approved: "Approved",
      rejected: "Rejected",
      pending: "Pending",
      completed: "Completed",
      in_progress: "In Progress",
    };
    return texts[status] || status;
  }

  const sizeClass = size === "sm" ? "badge-sm" : size === "lg" ? "badge-lg" : "";
</script>

<span class="badge {getBadgeClass(status)} {sizeClass}">
  {getStatusText(status)}
</span>
