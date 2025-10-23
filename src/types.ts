// Type definitions for inputs accepted by GitLab MCP tools.

/**
 * Input for creating a new project. The `name` field is required. You can
 * optionally specify a `namespaceId` to place the project under a specific
 * group or user namespace, a `description` for the project, and a
 * `visibility` level. See GitLab's documentation for valid visibility
 * values ("private", "internal", "public").
 */
export type CreateProjectInput = {
  name: string;
  namespaceId?: string;
  description?: string;
  visibility?: "private" | "internal" | "public";
};

/**
 * Input for creating a new issue. You must supply the project ID (or
 * URL‑encoded path) where the issue should be created and a `title`. The
 * optional `description` field populates the issue body. You can also
 * specify comma‑separated `labels` and an `assigneeId` for assignment.
 */
export type CreateIssueInput = {
  projectId: string;
  title: string;
  description?: string;
  labels?: string;
  assigneeId?: number;
};

/**
 * Input for creating a new branch. Provide the project ID, the name of the
 * branch to create, and the reference from which to create it (either an
 * existing branch name or a commit SHA).
 */
export type CreateBranchInput = {
  projectId: string;
  branch: string;
  ref: string;
};

/**
 * Input for retrieving a single issue. You must provide the project ID (or
 * URL‑encoded path) and the issue’s IID (internal ID). See GitLab’s
 * documentation for details on the `GET /projects/:id/issues/:issue_iid`
 * endpoint.
 */
export type GetIssueInput = {
  projectId: string;
  issueIid: number;
};

/**
 * Input for updating an existing issue. You must supply the project ID and
 * the issue’s IID. Optional fields mirror the parameters accepted by
 * GitLab’s `PUT /projects/:id/issues/:issue_iid` endpoint【925839063033099†L1419-L1455】. See the
 * Issues API for supported attributes such as `title`, `description`,
 * `labels`, `addLabels`, `removeLabels`, `stateEvent`, `assigneeIds` and
 * `dueDate`【925839063033099†L1419-L1455】. Unspecified properties will be omitted from the
 * request payload.
 */
export type UpdateIssueInput = {
  projectId: string;
  issueIid: number;
  title?: string;
  description?: string;
  labels?: string;
  addLabels?: string;
  removeLabels?: string;
  stateEvent?: "close" | "reopen";
  assigneeIds?: number[];
  dueDate?: string;
};

/**
 * Input for deleting an issue. Provide the project ID and the issue’s IID.
 * Only project owners or administrators may delete issues【925839063033099†L1595-L1616】.
 */
export type DeleteIssueInput = {
  projectId: string;
  issueIid: number;
};

/**
 * Input for listing notes (comments) on an issue. You must provide the
 * project ID and issue IID. Optional parameters allow sorting or filtering
 * the notes as described in GitLab’s Notes API【817593036777657†L88-L106】.
 */
export type ListIssueNotesInput = {
  projectId: string;
  issueIid: number;
  sort?: "asc" | "desc";
  orderBy?: "created_at" | "updated_at";
  activityFilter?: "all_notes" | "only_comments" | "only_activity";
};

/**
 * Input for creating a note (comment) on an issue. Requires the project
 * ID, the issue IID and the body content. You can optionally mark the
 * note as internal (visible only to project members)【817593036777657†L184-L200】.
 */
export type CreateIssueNoteInput = {
  projectId: string;
  issueIid: number;
  body: string;
  internal?: boolean;
};

/**
 * Input for updating an existing note. Provide the project ID, issue
 * IID and note ID. You can update the note body or its internal flag【817593036777657†L210-L225】.
 */
export type UpdateIssueNoteInput = {
  projectId: string;
  issueIid: number;
  noteId: number;
  body?: string;
  internal?: boolean;
};

/**
 * Input for deleting an issue note. Provide the project ID, issue IID
 * and note ID. Only users with appropriate permissions may delete
 * notes【817593036777657†L232-L248】.
 */
export type DeleteIssueNoteInput = {
  projectId: string;
  issueIid: number;
  noteId: number;
};