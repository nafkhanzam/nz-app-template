import type { ReportStatus, ReportType } from "#lib/zenstack/models";

export function reportStatusBadgeClass(status: ReportStatus | string): string {
  switch (status) {
    case "OPEN":
      return "badge-warning";
    case "IN_PROGRESS":
      return "badge-info";
    case "RESOLVED":
      return "badge-success";
    case "CLOSED":
    default:
      return "badge-ghost";
  }
}

export function reportTypeBadgeClass(type: ReportType | string): string {
  switch (type) {
    case "BUG":
      return "badge-error";
    case "FEEDBACK":
    default:
      return "badge-primary";
  }
}

export function reportTypeIcon(type: ReportType | string): string {
  switch (type) {
    case "BUG":
      return "heroicons:bug-ant";
    case "FEEDBACK":
    default:
      return "heroicons:chat-bubble-left-right";
  }
}

export const reportStatusOptions: ReportStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
export const reportTypeOptions: ReportType[] = ["BUG", "FEEDBACK"];
