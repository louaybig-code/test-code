// TypeScript Interfaces for Smash API DTOs

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
  path?: string;
  timestamp?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn?: string;
}

export interface UserNotificationSettings {
  inApp: boolean;
  email: boolean;
  push: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  locale?: string;
  timezone?: string;
  roles?: string[];
  notificationSettings?: UserNotificationSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonalToken {
  id: string;
  name: string;
  abilities?: string[];
  expiresAt?: string | null;
  createdAt?: string;
  token?: string; // Only returned once on creation
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' | 'CLIENT';
  user?: UserProfile;
  createdAt?: string;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' | 'CLIENT';
  token: string;
  expiresAt?: string;
  createdAt?: string;
}

export interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description?: string | null;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectFolder {
  id: string;
  projectId: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskSubtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  position: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  filename?: string; // Backend uses lowercase 'filename'
  fileName?: string; // Keep for backward compatibility
  size?: number; // Backend uses 'size'
  fileSize?: number; // Keep for backward compatibility
  mimeType?: string;
  url?: string;
  uploadedById?: string;
  createdAt?: string;
}

export interface TaskLink {
  id: string;
  sourceTaskId: string;
  targetTaskId: string;
  type: 'RELATES' | 'BLOCKS' | 'DUPLICATES';
  targetTask?: Partial<Task>;
  createdAt?: string;
}

export interface Task {
  id: string;
  projectId: string;
  folderId?: string | null;
  epicId?: string | null;
  sprintId?: string | null;
  title: string;
  description?: string | null;
  status: string; // e.g. 'todo', 'in_progress', 'done' or status key/id
  priority: TaskPriority;
  position: number;
  progress?: number; // 0-100 percentage
  assigneeId?: string | null;
  assignee?: UserProfile | null;
  creatorId?: string;
  dueDate?: string | null;
  archivedAt?: string | null;
  isFavorite?: boolean;
  subtasks?: TaskSubtask[];
  attachments?: TaskAttachment[];
  linksFrom?: TaskLink[];
  _count?: {
    favorites?: number;
    comments?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Epic {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  color?: string;
  position?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string | null;
  status?: 'PLANNED' | 'ACTIVE' | 'CLOSED';
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectStatus {
  id: string;
  projectId: string;
  key: string;
  name: string;
  color: string;
  category: 'TODO' | 'IN_PROGRESS' | 'DONE';
  position: number;
}

export interface ProjectWorkflowTransition {
  from: string;
  to: string;
}

export interface ProjectWorkflow {
  statuses: ProjectStatus[];
  transitions: ProjectWorkflowTransition[];
}

export interface BoardColumn {
  status: ProjectStatus;
  tasks: Task[];
}

export interface BoardData {
  columns: BoardColumn[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  mentions?: string[];
  editedAt?: string | null;
  createdAt?: string;
  author?: UserProfile;
}

export interface TaskActivity {
  id: string;
  taskId?: string;
  type: string;
  data?: {
    from?: string;
    to?: string;
    position?: number;
    commentId?: string;
    [key: string]: any;
  };
  createdAt?: string;
  actor?: {
    id: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string | null;
    email?: string;
  };
  // Legacy fields (kept for backwards compat)
  action?: string;
  changes?: Record<string, any>;
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string | null;
  };
}

export interface Channel {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  name: string;
  type: 'PUBLIC' | 'PRIVATE';
  createdAt?: string;
  updatedAt?: string;
}

export interface ChannelMessage {
  id: string;
  channelId: string;
  authorId: string;
  body: string;
  createdAt?: string;
  author?: UserProfile;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Project Members & Roles ──────────────────────────────────────────────────

// Abilities use colon notation matching the backend Swagger spec
export type ProjectAbility =
  | 'task:create'
  | 'task:update'
  | 'task:delete'
  | 'task:move'
  | 'comment:create'
  | 'sprint:manage'
  | 'workflow:manage';

export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' | 'CLIENT';

// Available system roles returned by GET /api/v1/roles
export interface RoleCatalogItem {
  role: OrgRole;
  description: string;
}

export interface RolesCatalog {
  roles: RoleCatalogItem[];
  projectAbilities: ProjectAbility[];
}

// Per-role ability assignment used by GET/PUT /api/v1/projects/{project}/permissions
export interface RolePermissionDto {
  role: OrgRole;
  abilities: ProjectAbility[];
}

export interface ProjectPermissions {
  permissions: RolePermissionDto[];
}

// ─── Legacy permission keys (kept for UI catalogue display) ──────────────────
export type PermissionKey =
  | 'task:create' | 'task:update' | 'task:delete' | 'task:move'
  | 'comment:create'
  | 'sprint:manage'
  | 'workflow:manage';

export interface ProjectPermission {
  key: PermissionKey;
  label: string;
  description: string;
  group: 'Tasks' | 'Comments' | 'Sprints & Workflow';
}

export interface ProjectRole {
  id: string;
  projectId: string;
  name: string;
  isSystem: boolean;
  permissions: PermissionKey[];
  createdAt?: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: OrgRole;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  joinedAt?: string;
  user?: UserProfile;
}

// ========== NEW TYPES FOR ADDITIONAL ENDPOINTS ==========

// Notification
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

// Saved Filter
export interface SavedFilter {
  id: string;
  userId: string;
  name: string;
  type: string;
  criteria: Record<string, any>;
  createdAt: string;
}

// Search Results
export interface SearchResults {
  tasks?: Task[];
  projects?: Project[];
  comments?: TaskComment[];
  total: number;
}

// Project Stats
export interface ProjectStats {
  totalTasks: number;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  completionRate: number;
  avgProgress: number;
}

// Legacy Role shape (kept for getRoles() backward compat)
export interface Role {
  id: string;
  name: OrgRole;
  abilities: string[];
}
