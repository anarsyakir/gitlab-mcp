import "dotenv/config";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  listProjects,
  getProject,
  createProject,
  listGroupProjects,
  listIssues,
  createIssue,
  listBranches,
  createBranch,
  getIssue,
  updateIssue,
  deleteIssue,
  listIssueNotes,
  createIssueNote,
  updateIssueNote,
  deleteIssueNote,
  listMergeRequests,
  getMergeRequest,
  getMergeRequestChanges,
  listMergeRequestDiffs,
  listMergeRequestNotes,
  createMergeRequestNote,
  getWorkItem,
  uploadProjectFile,
} from "./gitlab.js";

const server = new McpServer(
  { name: "gitlab-mcp", version: "0.2.0" },
  {
    capabilities: {
      tools: {},
    },
  },
);

const jsonResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

server.registerTool(
  "listProjects",
  {
    description:
      "List projects visible to the authenticated user. Optionally filter projects by search term.",
    inputSchema: {
      search: z.string().optional(),
      membership: z.boolean().optional(),
      owned: z.boolean().optional(),
      simple: z.boolean().optional(),
    },
  },
  async (input) => jsonResult(await listProjects(input)),
);

server.registerTool(
  "getProject",
  {
    description: "Retrieve details of a single project by ID or path.",
    inputSchema: {
      projectId: z.string(),
    },
  },
  async ({ projectId }) => jsonResult(await getProject(projectId)),
);

server.registerTool(
  "createProject",
  {
    description:
      "Create a new project. Provide a name and optionally namespaceId, description and visibility.",
    inputSchema: {
      name: z.string(),
      namespaceId: z.string().optional(),
      description: z.string().optional(),
      visibility: z.enum(["private", "internal", "public"]).optional(),
    },
  },
  async (input) => jsonResult(await createProject(input)),
);

server.registerTool(
  "listGroupProjects",
  {
    description:
      "List projects belonging to a specific group. Provide groupId as numeric ID or URL-encoded path.",
    inputSchema: {
      groupId: z.string(),
    },
  },
  async ({ groupId }) => jsonResult(await listGroupProjects(groupId)),
);

server.registerTool(
  "listIssues",
  {
    description: "List issues for a given project.",
    inputSchema: {
      projectId: z.string(),
    },
  },
  async ({ projectId }) => jsonResult(await listIssues(projectId)),
);

server.registerTool(
  "uploadProjectFile",
  {
    description:
      "Upload a local file (e.g. a mockup PNG) to a project so it can be embedded in an issue or note. Returns `markdown` to paste into the description.",
    inputSchema: {
      projectId: z.string(),
      filePath: z.string(),
      fileName: z.string().optional(),
    },
  },
  async (input) => jsonResult(await uploadProjectFile(input)),
);

server.registerTool(
  "createIssue",
  {
    description:
      "Create an issue in a project. Title is required. Optionally specify description, labels (comma-separated) and assigneeId.",
    inputSchema: {
      projectId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      labels: z.string().optional(),
      assigneeId: z.number().int().optional(),
      milestoneId: z.number().int().optional(),
    },
  },
  async (input) => jsonResult(await createIssue(input)),
);

server.registerTool(
  "listBranches",
  {
    description: "List branches for a project.",
    inputSchema: {
      projectId: z.string(),
    },
  },
  async ({ projectId }) => jsonResult(await listBranches(projectId)),
);

server.registerTool(
  "createBranch",
  {
    description:
      "Create a new branch in a project. Provide branch name and reference (branch name or commit SHA).",
    inputSchema: {
      projectId: z.string(),
      branch: z.string(),
      ref: z.string(),
    },
  },
  async (input) => jsonResult(await createBranch(input)),
);

server.registerTool(
  "getIssue",
  {
    description:
      "Retrieve details of a single issue within a project by providing the project ID and the issue IID.",
    inputSchema: {
      projectId: z.string(),
      issueIid: z.number().int(),
    },
  },
  async (input) => jsonResult(await getIssue(input)),
);

server.registerTool(
  "updateIssue",
  {
    description:
      "Update an existing issue. Provide projectId and issueIid along with optional fields such as title, description, labels, addLabels, removeLabels, stateEvent, assigneeIds and dueDate.",
    inputSchema: {
      projectId: z.string(),
      issueIid: z.number().int(),
      title: z.string().optional(),
      description: z.string().optional(),
      labels: z.string().optional(),
      addLabels: z.string().optional(),
      removeLabels: z.string().optional(),
      stateEvent: z.enum(["close", "reopen"]).optional(),
      assigneeIds: z.array(z.number().int()).optional(),
      dueDate: z.string().optional(),
      milestoneId: z.number().int().optional(),
    },
  },
  async (input) => jsonResult(await updateIssue(input)),
);

server.registerTool(
  "deleteIssue",
  {
    description:
      "Delete an issue. Only administrators or project owners can perform this action.",
    inputSchema: {
      projectId: z.string(),
      issueIid: z.number().int(),
    },
  },
  async (input) => jsonResult(await deleteIssue(input)),
);

server.registerTool(
  "listIssueNotes",
  {
    description:
      "List notes (comments) for a project issue. You can optionally sort or filter the notes by activity.",
    inputSchema: {
      projectId: z.string(),
      issueIid: z.number().int(),
      sort: z.enum(["asc", "desc"]).optional(),
      orderBy: z.enum(["created_at", "updated_at"]).optional(),
      activityFilter: z
        .enum(["all_notes", "only_comments", "only_activity"])
        .optional(),
    },
  },
  async (input) => jsonResult(await listIssueNotes(input)),
);

server.registerTool(
  "createIssueNote",
  {
    description:
      "Add a new note (comment) to a project issue. Provide the comment body and optionally mark it as internal.",
    inputSchema: {
      projectId: z.string(),
      issueIid: z.number().int(),
      body: z.string(),
      internal: z.boolean().optional(),
    },
  },
  async (input) => jsonResult(await createIssueNote(input)),
);

server.registerTool(
  "updateIssueNote",
  {
    description:
      "Modify an existing note on an issue. Provide the note ID and optionally update its body or internal flag.",
    inputSchema: {
      projectId: z.string(),
      issueIid: z.number().int(),
      noteId: z.number().int(),
      body: z.string().optional(),
      internal: z.boolean().optional(),
    },
  },
  async (input) => jsonResult(await updateIssueNote(input)),
);

server.registerTool(
  "deleteIssueNote",
  {
    description:
      "Delete a note from an issue. Provide the note ID along with the project ID and issue IID.",
    inputSchema: {
      projectId: z.string(),
      issueIid: z.number().int(),
      noteId: z.number().int(),
    },
  },
  async (input) => jsonResult(await deleteIssueNote(input)),
);

server.registerTool(
  "listMergeRequests",
  {
    description:
      "List merge requests for a project. Optionally filter by state (opened/closed/locked/merged) or a search term.",
    inputSchema: {
      projectId: z.string(),
      state: z.enum(["opened", "closed", "locked", "merged"]).optional(),
      search: z.string().optional(),
    },
  },
  async (input) => jsonResult(await listMergeRequests(input)),
);

server.registerTool(
  "getMergeRequest",
  {
    description:
      "Retrieve details of a single merge request within a project by providing the project ID and the merge request IID.",
    inputSchema: {
      projectId: z.string(),
      mergeRequestIid: z.number().int(),
    },
  },
  async (input) => jsonResult(await getMergeRequest(input)),
);

server.registerTool(
  "getMergeRequestChanges",
  {
    description:
      "Retrieve the file-by-file diff/changes for a merge request.",
    inputSchema: {
      projectId: z.string(),
      mergeRequestIid: z.number().int(),
    },
  },
  async (input) => jsonResult(await getMergeRequestChanges(input)),
);

server.registerTool(
  "listMergeRequestDiffs",
  {
    description:
      "List the merge request diff versions/entries. Useful when getMergeRequestChanges truncates a large diff.",
    inputSchema: {
      projectId: z.string(),
      mergeRequestIid: z.number().int(),
    },
  },
  async (input) => jsonResult(await listMergeRequestDiffs(input)),
);

server.registerTool(
  "listMergeRequestNotes",
  {
    description: "List notes (comments) for a merge request.",
    inputSchema: {
      projectId: z.string(),
      mergeRequestIid: z.number().int(),
      sort: z.enum(["asc", "desc"]).optional(),
      orderBy: z.enum(["created_at", "updated_at"]).optional(),
    },
  },
  async (input) => jsonResult(await listMergeRequestNotes(input)),
);

server.registerTool(
  "createMergeRequestNote",
  {
    description:
      "Add a new note (comment) to a merge request. Provide the comment body and optionally mark it as internal.",
    inputSchema: {
      projectId: z.string(),
      mergeRequestIid: z.number().int(),
      body: z.string(),
      internal: z.boolean().optional(),
    },
  },
  async (input) => jsonResult(await createMergeRequestNote(input)),
);

server.registerTool(
  "getWorkItem",
  {
    description:
      "Retrieve a single GitLab work item (the unified issue/epic/task type) by project path and work item IID, via the GraphQL API.",
    inputSchema: {
      projectPath: z.string(),
      workItemIid: z.union([z.string(), z.number()]),
    },
  },
  async (input) => jsonResult(await getWorkItem(input)),
);

const projectResourceTemplate = new ResourceTemplate(
  "gitlab://project/{projectId}",
  {
    list: async () => {
      const projects = await listProjects({ simple: true, membership: true });
      return {
        resources: projects.map((project: any) => ({
          uri: `gitlab://project/${project.id}`,
          name: project.path_with_namespace ?? String(project.id),
          title: project.name_with_namespace ?? project.name,
          description:
            project.description ??
            `GitLab project ${project.path_with_namespace ?? project.id}`,
          mimeType: "application/json",
        })),
      };
    },
    complete: {
      projectId: async (value) => {
        const query = value?.trim();
        const projects = await listProjects({
          simple: true,
          membership: true,
          ...(query ? { search: query } : {}),
        });
        return projects.map((project: any) => String(project.id));
      },
    },
  },
);

server.resource(
  "gitlab-project",
  projectResourceTemplate,
  {
    title: "GitLab project metadata",
    description:
      "Project information fetched from GitLab. Use the numeric project ID in the URI.",
    mimeType: "application/json",
  },
  async (uri, variables) => {
    const rawProjectId = variables.projectId;
    const projectId = Array.isArray(rawProjectId)
      ? rawProjectId[0]
      : rawProjectId;
    if (!projectId) {
      throw new Error("Missing projectId in resource URI.");
    }
    const project = await getProject(projectId);
    return {
      contents: [
        {
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify(project, null, 2),
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
