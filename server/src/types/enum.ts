// ── ENUMS ──
export enum Role {
  OWNER,
  ADMIN,
  MANAGER,
  MEMBER,
  VIEWER,
}
export enum ProjectRole {
  MANAGER,
  MEMBER,
  VIEWER,
}
export enum ProjectStatus {
  ACTIVE,
  ON_HOLD,
  COMPLETED,
  ARCHIVED,
}
export enum TaskStatus {
  TODO,
  IN_PROGRESS,
  IN_REVIEW,
  DONE,
  BLOCKED,
}
export enum Priority {
  LOW,
  MEDIUM,
  HIGH,
  URGENT,
}
export enum NotificationType {
  TASK_ASSIGNED,
  TASK_COMMENTED,
  DUE_SOON,
  MENTIONED,
  MEMBER_JOINED,
}
