// ESM + Node 22 (global fetch). Converts plain text to ADF and auto-resolves a valid issue type via CreateMeta.
// Env needed: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY
// Optional: JIRA_ISSUE_TYPE (name like "Bug" | "Task" | "Story"), JIRA_LABELS
const baseUrl = process.env.JIRA_BASE_URL || "";
const email = process.env.JIRA_EMAIL || "";
const apiToken = process.env.JIRA_API_TOKEN || "";
const projectKey = process.env.JIRA_PROJECT_KEY || "";
const desiredIssueType = (process.env.JIRA_ISSUE_TYPE || "Bug").trim();
const defaultLabels = (process.env.JIRA_LABELS || "").split(",").map(s => s.trim()).filter(Boolean);

function assertEnv() {
  const miss: string[] = [];
  if (!baseUrl) miss.push("JIRA_BASE_URL");
  if (!email) miss.push("JIRA_EMAIL");
  if (!apiToken) miss.push("JIRA_API_TOKEN");
  if (!projectKey) miss.push("JIRA_PROJECT_KEY");
  if (miss.length) throw new Error("Missing Jira env: " + miss.join(", "));
}

function toADF(text: string) {
  return {
    version: 1,
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: text || "" }] }
    ]
  };
}

function authHeader() {
  const token = Buffer.from(`${email}:${apiToken}`).toString("base64");
  return `Basic ${token}`;
}

// Find an allowed issuetype for this project (prefer env JIRA_ISSUE_TYPE, else Bug/Task/Story, else first)
async function resolveIssueTypeId(): Promise<{ id?: string; name: string }> {
  const url = `${baseUrl.replace(/\/+$/, "")}/rest/api/3/issue/createmeta?projectKeys=${encodeURIComponent(projectKey)}&expand=projects.issuetypes`;
  const res = await fetch(url, { headers: { Authorization: authHeader(), Accept: "application/json" } });
  if (!res.ok) throw new Error(`Jira CreateMeta failed: ${res.status} ${await res.text()}`);
  const j = await res.json() as any;
  const types: Array<{ id: string; name: string }> = j?.projects?.[0]?.issuetypes || [];
  if (!types.length) throw new Error("No issuetypes enabled for project.");

  const findByName = (n: string) => types.find(t => t.name.toLowerCase() === n.toLowerCase());
  const pref = findByName(desiredIssueType) || findByName("Bug") || findByName("Task") || findByName("Story") || types[0];
  return { id: pref.id, name: pref.name };
}

export type CreateIssueInput = {
  summary: string;
  descriptionText: string; // plain text; converted to ADF
  labels?: string[];
};

export async function createIssue(input: CreateIssueInput) {
  assertEnv();
  const { id, name } = await resolveIssueTypeId();

  const url = `${baseUrl.replace(/\/+$/, "")}/rest/api/3/issue`;
  const body = {
    fields: {
      project: { key: projectKey },
      issuetype: id ? { id } : { name },
      summary: input.summary,
      description: toADF(input.descriptionText),
      labels: [...(input.labels || []), ...defaultLabels],
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Jira createIssue failed: ${res.status} ${txt}`);
  }
  return res.json() as Promise<{ id: string; key: string }>;
}

export async function deleteIssue(key: string) {
  assertEnv();
  const url = `${baseUrl.replace(/\/+$/, "")}/rest/api/3/issue/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: authHeader(), Accept: "application/json" },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Jira deleteIssue failed: ${res.status} ${txt}`);
  }
}

export async function health() {
  try {
    assertEnv();
    // simple check: project API
    const url = `${baseUrl.replace(/\/+$/, "")}/rest/api/3/project/${encodeURIComponent(projectKey)}`;
    const res = await fetch(url, { headers: { Authorization: authHeader(), Accept: "application/json" } });
    return res.ok;
  } catch {
    return false;
  }
}

