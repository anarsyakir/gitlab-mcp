import {
  Headers,
  fetch,
  type BodyInit as UndiciBodyInit,
  type RequestInit as UndiciRequestInit,
} from "undici";
import { env } from "process";

/**
 * Minimal wrapper around the GitLab REST API. Reads the base URL and
 * authentication token from environment variables. See `.env.example` for
 * configuration. All functions throw on non‑2xx responses.
 */

const BASE = env.GITLAB_BASE_URL || "https://gitlab.com/api/v4";
const TOKEN = env.GITLAB_TOKEN;

if (!TOKEN) {
  console.warn(
    "[gitlab-mcp] Warning: GITLAB_TOKEN is not set. API calls may fail for private resources."
  );
}

/**
 * Perform an HTTP request against the GitLab API. Prepends the base URL and
 * attaches authentication headers. Throws an error if the response status
 * indicates failure.
 *
 * @param path Relative path beginning with a slash (e.g. `/projects`)
 * @param init Optional fetch options. If a `body` object is provided and
 *   `Content-Type` is not set, it will default to `application/json` and be
 *   stringified.
 */
type ApiRequestInit = Omit<UndiciRequestInit, "body"> & {
  body?: UndiciRequestInit["body"] | Record<string, unknown>;
};

async function apiFetch(path: string, init: ApiRequestInit = {}): Promise<any> {
  const url = `${BASE}${path}`;

  const { body: initBody, headers: initHeaders, ...restInit } = init;

  const headers = new Headers(initHeaders ?? undefined);
  // Use GitLab's "PRIVATE-TOKEN" header for personal access tokens. Fall back
  // to Bearer if the caller explicitly sets Authorization.
  if (TOKEN && !headers.has("Authorization")) {
    headers.set("PRIVATE-TOKEN", TOKEN);
  }

  // If the body is an object, JSON‑encode it and set appropriate header.
  const rawBody = initBody;
  const shouldSerialize =
    rawBody &&
    typeof rawBody === "object" &&
    !(rawBody instanceof ArrayBuffer) &&
    !ArrayBuffer.isView(rawBody) &&
    !(rawBody instanceof URLSearchParams) &&
    !(
      typeof FormData !== "undefined" && rawBody instanceof FormData
    ) &&
    !(typeof Blob !== "undefined" && rawBody instanceof Blob) &&
    !(
      typeof ReadableStream !== "undefined" &&
      rawBody instanceof ReadableStream
    );

  let body: UndiciBodyInit | null | undefined;
  if (shouldSerialize) {
    body = JSON.stringify(rawBody);
  } else if (rawBody === undefined) {
    body = undefined;
  } else if (rawBody === null) {
    body = null;
  } else {
    body = rawBody as UndiciBodyInit;
  }

  if (shouldSerialize) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  const res = await fetch(url, { ...restInit, headers, body });
  const text = await res.text();

  if (!res.ok) {
    let message = text;
    try {
      const json = JSON.parse(text);
      message = JSON.stringify(json);
    } catch {
      /* ignore */
    }
    throw new Error(`GitLab API error ${res.status}: ${message}`);
  }

  // Attempt to parse JSON; return raw text if parsing fails
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * List projects accessible by the authenticated user. You can provide a
 * `search` term to filter projects by name or description. Other query
 * parameters such as `membership`, `owned` and `simple` can be supported by
 * extending the argument type.
 */
export async function listProjects(params?: {
  search?: string;
  membership?: boolean;
  owned?: boolean;
  simple?: boolean;
}): Promise<any> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.membership) qs.set("membership", String(params.membership));
  if (params?.owned) qs.set("owned", String(params.owned));
  if (params?.simple) qs.set("simple", String(params.simple));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch(`/projects${suffix}`);
}

/**
 * Retrieve details of a single project by its ID or path. Accepts either the
 * numeric ID or the URL‑encoded path (e.g. `my-group/my-project`).
 */
export async function getProject(projectId: string | number): Promise<any> {
  return apiFetch(`/projects/${encodeURIComponent(String(projectId))}`);
}

/**
 * Create a new project. Provide at minimum a name. You can optionally specify
 * a namespace ID, description and visibility. See
 * https://docs.gitlab.com/api/projects/#create-project for details.
 */
export async function createProject(input: {
  name: string;
  namespaceId?: string;
  description?: string;
  visibility?: string;
}): Promise<any> {
  const payload: Record<string, any> = { name: input.name };
  if (input.namespaceId) payload.namespace_id = input.namespaceId;
  if (input.description) payload.description = input.description;
  if (input.visibility) payload.visibility = input.visibility;
  return apiFetch(`/projects`, { method: "POST", body: payload });
}

/**
 * List projects under a specific group by group ID or path. See
 * https://docs.gitlab.com/api/groups/#list-a-groups-projects.
 */
export async function listGroupProjects(groupId: string | number): Promise<any> {
  return apiFetch(`/groups/${encodeURIComponent(String(groupId))}/projects`);
}

/**
 * List issues for a given project. Only issues the authenticated user can see
 * are returned. For more advanced filtering, extend the argument type with
 * additional parameters documented in the GitLab API.
 */
export async function listIssues(projectId: string | number): Promise<any> {
  return apiFetch(`/projects/${encodeURIComponent(String(projectId))}/issues`);
}

/**
 * Create an issue in the specified project. A title is required. You can
 * include an optional description, comma‑separated labels and an assignee ID.
 */
export async function createIssue(input: {
  projectId: string | number;
  title: string;
  description?: string;
  labels?: string;
  assigneeId?: number;
}): Promise<any> {
  const payload: Record<string, any> = {
    title: input.title,
  };
  if (input.description) payload.description = input.description;
  if (input.labels) payload.labels = input.labels;
  if (input.assigneeId !== undefined) payload.assignee_ids = [input.assigneeId];
  return apiFetch(
    `/projects/${encodeURIComponent(String(input.projectId))}/issues`,
    { method: "POST", body: payload }
  );
}

/**
 * List branches for a project. Returns detailed information about each branch
 * including commit metadata. You can provide a search term or regex by
 * extending the params argument.
 */
export async function listBranches(projectId: string | number): Promise<any> {
  return apiFetch(
    `/projects/${encodeURIComponent(String(projectId))}/repository/branches`
  );
}

/**
 * Create a new branch in the specified project. You must provide the name of
 * the branch to create (`branch`) and the reference (`ref`) from which to
 * create it (either another branch name or a commit SHA). See
 * https://docs.gitlab.com/api/branches/#create-repository-branch for details.
 */
export async function createBranch(input: {
  projectId: string | number;
  branch: string;
  ref: string;
}): Promise<any> {
  const qs = new URLSearchParams({
    branch: input.branch,
    ref: input.ref,
  });
  return apiFetch(
    `/projects/${encodeURIComponent(String(input.projectId))}/repository/branches?${qs.toString()}`,
    { method: "POST" }
  );
}

/**
 * Retrieve a single issue within a project. You must provide the project ID
 * (numeric or URL‑encoded path) and the issue’s internal ID (`issue_iid`).
 * See https://docs.gitlab.com/api/issues/#single-issue for details.
 */
export async function getIssue(input: {
  projectId: string | number;
  issueIid: number;
}): Promise<any> {
  return apiFetch(
    `/projects/${encodeURIComponent(String(input.projectId))}/issues/${input.issueIid}`
  );
}

/**
 * Update an existing issue. Provide the project ID and issue IID along with
 * any fields you wish to change. Unspecified fields are omitted from the
 * request. Supported parameters include `title`, `description`, `labels`,
 * `addLabels`, `removeLabels`, `stateEvent` (close or reopen),
 * `assigneeIds` and `dueDate`. See the Issues API documentation【925839063033099†L1419-L1455】.
 */
export async function updateIssue(input: {
  projectId: string | number;
  issueIid: number;
  title?: string;
  description?: string;
  labels?: string;
  addLabels?: string;
  removeLabels?: string;
  stateEvent?: string;
  assigneeIds?: number[];
  dueDate?: string;
}): Promise<any> {
  const payload: Record<string, any> = {};
  if (input.title !== undefined) payload.title = input.title;
  if (input.description !== undefined) payload.description = input.description;
  if (input.labels !== undefined) payload.labels = input.labels;
  if (input.addLabels !== undefined) payload.add_labels = input.addLabels;
  if (input.removeLabels !== undefined) payload.remove_labels = input.removeLabels;
  if (input.stateEvent !== undefined) payload.state_event = input.stateEvent;
  if (input.assigneeIds !== undefined) payload.assignee_ids = input.assigneeIds;
  if (input.dueDate !== undefined) payload.due_date = input.dueDate;
  return apiFetch(
    `/projects/${encodeURIComponent(String(input.projectId))}/issues/${input.issueIid}`,
    { method: "PUT", body: payload }
  );
}

/**
 * Delete an issue. Requires project owner or administrator permissions.
 * Returns an empty response on success【925839063033099†L1595-L1616】.
 */
export async function deleteIssue(input: {
  projectId: string | number;
  issueIid: number;
}): Promise<any> {
  return apiFetch(
    `/projects/${encodeURIComponent(String(input.projectId))}/issues/${input.issueIid}`,
    { method: "DELETE" }
  );
}

/**
 * List notes (comments) for a project issue. Accepts optional sorting and
 * filtering parameters as described in the Notes API【817593036777657†L88-L106】.
 */
export async function listIssueNotes(input: {
  projectId: string | number;
  issueIid: number;
  sort?: string;
  orderBy?: string;
  activityFilter?: string;
}): Promise<any> {
  const qs = new URLSearchParams();
  if (input.sort) qs.set("sort", input.sort);
  if (input.orderBy) qs.set("order_by", input.orderBy);
  if (input.activityFilter) qs.set("activity_filter", input.activityFilter);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch(
    `/projects/${encodeURIComponent(String(input.projectId))}/issues/${input.issueIid}/notes${suffix}`
  );
}

/**
 * Create a new note (comment) on an issue【817593036777657†L184-L209】.
 */
export async function createIssueNote(input: {
  projectId: string | number;
  issueIid: number;
  body: string;
  internal?: boolean;
}): Promise<any> {
  const payload: Record<string, any> = { body: input.body };
  if (input.internal !== undefined) payload.internal = input.internal;
  return apiFetch(
    `/projects/${encodeURIComponent(String(input.projectId))}/issues/${input.issueIid}/notes`,
    { method: "POST", body: payload }
  );
}

/**
 * Update an existing note on an issue【817593036777657†L210-L225】.
 */
export async function updateIssueNote(input: {
  projectId: string | number;
  issueIid: number;
  noteId: number;
  body?: string;
  internal?: boolean;
}): Promise<any> {
  const payload: Record<string, any> = {};
  if (input.body !== undefined) payload.body = input.body;
  if (input.internal !== undefined) payload.internal = input.internal;
  return apiFetch(
    `/projects/${encodeURIComponent(String(input.projectId))}/issues/${input.issueIid}/notes/${input.noteId}`,
    { method: "PUT", body: payload }
  );
}

/**
 * Delete a note from an issue【817593036777657†L232-L248】.
 */
export async function deleteIssueNote(input: {
  projectId: string | number;
  issueIid: number;
  noteId: number;
}): Promise<any> {
  return apiFetch(
    `/projects/${encodeURIComponent(String(input.projectId))}/issues/${input.issueIid}/notes/${input.noteId}`,
    { method: "DELETE" }
  );
}
