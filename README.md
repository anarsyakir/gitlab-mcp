# GitLab MCP Server

This repository contains an implementation of a Model Context Protocol (MCP) server that exposes a subset of the [GitLab REST API](https://docs.gitlab.com/ee/api/) as callable tools. It is implemented in TypeScript using the official MCP SDK and runs over standard input/output, making it easy to integrate with any MCP‑capable host (for example, [Codex](https://github.com/sourcegraph/codex)).

## Features

The server wraps several common GitLab operations:

- `listProjects` &mdash; List projects visible to the authenticated user, with optional search and filters.
- `getProject` &mdash; Retrieve details about a single project by ID or namespaced path.
- `createProject` &mdash; Create a new project; supports optional `namespaceId`, `description` and `visibility`.
- `listGroupProjects` &mdash; List projects that belong to a particular group.
- `listIssues` &mdash; List issues for a specific project.
- `createIssue` &mdash; Create an issue in a project with a title, optional description, labels and assignee.
- `listBranches` &mdash; List branches in a project along with their commit metadata.
- `createBranch` &mdash; Create a new branch from an existing branch or commit SHA.

### Issue management

New in version **0.2.0** of this server are tools for managing issues more comprehensively:

- `getIssue` &mdash; Retrieve details of a single issue by providing the project ID and the issue’s internal ID (IID).
- `updateIssue` &mdash; Update an existing issue. You can modify the title, description, labels, assign users, change due dates or close/reopen the issue using the [`stateEvent`] parameter【925839063033099†L1419-L1455】.
- `deleteIssue` &mdash; Delete an issue (requires project owner or administrator permissions)【925839063033099†L1595-L1616】.
- `listIssueNotes` &mdash; List comments (notes) associated with an issue. Supports sorting and filtering options【817593036777657†L88-L106】.
- `createIssueNote` &mdash; Add a new comment to an issue【817593036777657†L184-L209】.
- `updateIssueNote` &mdash; Modify an existing note on an issue【817593036777657†L210-L225】.
- `deleteIssueNote` &mdash; Delete a note from an issue【817593036777657†L232-L248】.

Each tool validates its inputs using `zod` before making an API call. Results are returned as JSON strings for easy consumption by your host.

## Configuration

Copy `.env.example` to `.env` and provide your own settings:

```ini
# Base URL for the GitLab API. Defaults to the public GitLab instance.
GITLAB_BASE_URL=https://gitlab.com/api/v4

# Personal access token with appropriate scopes (for example, `api`).
GITLAB_TOKEN=your_private_token
```

The server reads these environment variables at startup. If you omit `GITLAB_TOKEN`, calls to private resources will fail.

## Development

Install dependencies and run in development mode:

```bash
npm install
npm run dev
```

This starts the MCP server in watch mode using `tsx`. It reads from standard input and writes to standard output. To build the project for production, run:

```bash
npm run build
```

You can then start the compiled server with:

```bash
node dist/server.js
```

## Docker

To build and run the server in a container:

```bash
# 1) Build the image
docker build -t gitlab-mcp .

# 2) Run the container with your environment variables
docker run -it --rm \
  -e GITLAB_BASE_URL=https://gitlab.com/api/v4 \
  -e GITLAB_TOKEN=<your_token> \
  gitlab-mcp
```

Alternatively, use `docker-compose`:

```bash
cp .env.example .env
# edit .env with your values
docker compose up --build
```

## Integrating with Codex on VS Code

After building this MCP server, you can wire it into your Codex configuration. Assuming you have extracted the zip archive somewhere on your machine and installed the [Codex VS Code extension](https://marketplace.visualstudio.com/items?itemName=sourcegraph.sourcegraph-codex):

1. Identify the absolute path to `dist/server.js` in this project.
2. Open your Codex settings (`~/.codex/config.toml` or via the Codex Settings GUI).
3. Add a server definition under the `[mcp_servers]` table:

```toml
[mcp_servers.gitlab]
command = "/usr/bin/node"
args = ["/absolute/path/to/gitlab-mcp/dist/server.js"]
[mcp_servers.gitlab.env]
GITLAB_BASE_URL = "https://gitlab.com/api/v4"
GITLAB_TOKEN = "<your_token>"

# optional: enable RMCP client implementation
experimental_use_rmcp_client = true
```

4. Reload Codex. You should see `listProjects`, `getProject`, `createProject`, etc. available as tools in your chat.

## Example tool calls

- **List your projects:**

  Use the tool from your MCP host: `listProjects {}` or add a search term: `listProjects { "search": "my-repo" }`.

- **Create a project:**

  ```json
  createProject {
    "name": "my-cool-project",
    "namespaceId": "12345",   // optional, numeric ID or path
    "description": "Project created via MCP",
    "visibility": "private"
  }
  ```

- **List issues for a project:**

  ```json
  listIssues { "projectId": "my-group/my-project" }
  ```

- **Create an issue:**

  ```json
  createIssue {
    "projectId": "my-group/my-project",
    "title": "Bug: cannot login",
    "description": "Steps to reproduce...",
    "labels": "bug,urgent"
  }
  ```

- **Create a branch:**

  ```json
  createBranch {
    "projectId": "my-group/my-project",
    "branch": "feature/new-api",
    "ref": "main"
  }
  ```

- **Get a single issue:**

  ```json
  getIssue {
    "projectId": "my-group/my-project",
    "issueIid": 42
  }
  ```

- **Update an issue (for example, add labels and close it):**

  ```json
  updateIssue {
    "projectId": "my-group/my-project",
    "issueIid": 42,
    "addLabels": "frontend,urgent",
    "stateEvent": "close"
  }
  ```

- **Delete an issue:**

  ```json
  deleteIssue { "projectId": "my-group/my-project", "issueIid": 42 }
  ```

- **Add a comment to an issue:**

  ```json
  createIssueNote {
    "projectId": "my-group/my-project",
    "issueIid": 42,
    "body": "We are investigating this bug."
  }
  ```

- **List comments on an issue:**

  ```json
  listIssueNotes { "projectId": "my-group/my-project", "issueIid": 42 }
  ```

- **Update a comment:**

  ```json
  updateIssueNote {
    "projectId": "my-group/my-project",
    "issueIid": 42,
    "noteId": 123,
    "body": "Updated comment text"
  }
  ```

- **Delete a comment:**

  ```json
  deleteIssueNote {
    "projectId": "my-group/my-project",
    "issueIid": 42,
    "noteId": 123
  }
  ```

Feel free to extend `src/gitlab.ts` and `src/server.ts` with additional endpoints such as merge requests, pipelines, or users. See the official GitLab API documentation for guidance【333395904541159†L254-L306】 and adapt the input schemas accordingly.