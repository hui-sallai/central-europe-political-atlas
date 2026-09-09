import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const publicCandidateFiles = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root })
  .toString("utf8")
  .split("\0")
  .filter(Boolean);
const trackedFiles = new Set(execFileSync("git", ["ls-files", "-z"], { cwd: root }).toString("utf8").split("\0"));
if (process.argv.includes("--static")) {
  const collect = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(absolute);
      else if (/\.(?:html|js|css|json|txt|xml|csv|md|map)$/i.test(entry.name)) publicCandidateFiles.push(path.relative(root, absolute));
    }
  };
  collect(path.join(root, "out"));
}

const forbiddenTrackedNames = [
  /(^|\/)\.env(?:\.|$)/i,
  /(^|\/)(?:id_rsa|id_ed25519|credentials\.json)$/i,
  /\.(?:pem|p12|pfx|key)$/i,
  /\.(?:log|zip)$/i,
];

const contentPatterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["GitHub token", /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{30,}\b/],
  ["OpenAI API key", /\bsk-(?:proj-|svcacct-)[A-Za-z0-9_-]{20,}\b/],
  ["legacy API key", /\bsk-[A-Za-z0-9]{40,}\b/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ["local user path", /\b[A-Za-z]:(?:\\{1,2}|\/)+Users(?:\\{1,2}|\/)+(?!Public(?:\\{1,2}|\/)+)/i],
  ["private Unix home path", /\/(?:Users|home)\/[A-Za-z0-9_.-]+\//],
];

const failures = [];

for (const file of publicCandidateFiles) {
  if (file === "scripts/security/check-public-secrets.mjs") continue;
  if (trackedFiles.has(file) && /(^|\/)\.DS_Store$/.test(file)) failures.push(`${file}: tracked local metadata`);
  if (forbiddenTrackedNames.some((pattern) => pattern.test(file))) {
    failures.push(`${file}: forbidden sensitive or local artifact type`);
    continue;
  }

  const absolutePath = path.join(root, file);
  if (!fs.existsSync(absolutePath)) continue;

  let content;
  try {
    content = fs.readFileSync(absolutePath, "utf8");
  } catch {
    continue;
  }

  for (const [label, pattern] of contentPatterns) {
    if (pattern.test(content)) failures.push(`${file}: possible ${label}`);
  }
}

// Inspect outgoing committed blobs, not only the working tree: a secret added
// and then removed in a later commit must still block publication of that history.
let outgoingBlobs = 0;
if (process.argv.includes("--outgoing")) {
  const updates = fs.readFileSync(0,"utf8").trim().split("\n").filter(Boolean);
  const seen = new Set();
  for (const update of updates) {
    const [,localSha,,remoteSha] = update.split(/\s+/);
    if (!/^[a-f0-9]{40,64}$/.test(localSha ?? "") || !/^[a-f0-9]{40,64}$/.test(remoteSha ?? "")) throw new Error("Invalid pre-push ref input");
    if (/^0+$/.test(localSha)) continue;
    const revisions = /^0+$/.test(remoteSha) ? [localSha,"--not","--remotes"] : [`${remoteSha}..${localSha}`];
    const commits = execFileSync("git",["rev-list",...revisions],{cwd:root}).toString().trim().split("\n").filter(Boolean);
    for (const commit of commits) {
      const names = execFileSync("git",["diff-tree","--root","--no-commit-id","--diff-filter=ACMRT","-r","--name-only","-z",commit],{cwd:root}).toString().split("\0").filter(Boolean);
      for (const name of names) {
        const oid = execFileSync("git",["rev-parse",`${commit}:${name}`],{cwd:root}).toString().trim();
        if (seen.has(oid)) continue;
        seen.add(oid); outgoingBlobs++;
        if (forbiddenTrackedNames.some(pattern => pattern.test(name)) || /(^|\/)\.DS_Store$/.test(name)) failures.push(`${name}: forbidden outgoing artifact`);
        if (name === "scripts/security/check-public-secrets.mjs") continue;
        const content = execFileSync("git",["cat-file","blob",oid],{cwd:root,maxBuffer:64*1024*1024}).toString("utf8");
        for (const [label,pattern] of contentPatterns) if (pattern.test(content)) failures.push(`${name}: possible ${label} in outgoing history`);
      }
    }
  }
  console.log(`Outgoing history scanned: ${outgoingBlobs} unique changed blobs.`);
}

if (failures.length) {
  console.error(`Public-secret scan failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Public-secret scan passed: ${publicCandidateFiles.length} tracked and publish-candidate files checked.`);
