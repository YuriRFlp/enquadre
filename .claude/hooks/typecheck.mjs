#!/usr/bin/env node
// Hook "Stop" do Claude Code: ao fim de cada turno, roda o typecheck dos pacotes
// alterados no monorepo. Se falhar, devolve os erros ao Claude (exit 2) para que
// ele corrija. Se já é a segunda tentativa no mesmo turno, só avisa o
// desenvolvedor (exit 1), para não prender o Claude em loop.

import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const MAX_OUTPUT = 4000;

function readInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

function changedFiles() {
  try {
    const out = execSync("git status --porcelain --untracked-files=all", {
      cwd: root,
      encoding: "utf8",
    });
    return out
      .split("\n")
      .filter(Boolean)
      .map((line) => line.slice(3).split(" -> ").pop().replace(/"/g, ""));
  } catch {
    return null; // fora de um repositório git
  }
}

function workspaceOf(file) {
  const match = file.match(/^(apps|packages)\/([^/]+)\//);
  return match ? `${match[1]}/${match[2]}` : null;
}

const relevant = (file) =>
  /\.(ts|tsx|mts|cts)$/.test(file) ||
  /(^|\/)(tsconfig[^/]*\.json|package\.json)$/.test(file) ||
  file.endsWith("schema.prisma");

const input = readInput();

// Antes da Sprint 0 não há monorepo: nada a fazer.
if (!existsSync(join(root, "pnpm-workspace.yaml"))) process.exit(0);

const files = changedFiles();
if (!files) process.exit(0);

const touched = new Set(files.filter(relevant).map(workspaceOf).filter(Boolean));
if (touched.size === 0) process.exit(0);

// Mudança em pacote compartilhado afeta todo mundo: checa o monorepo inteiro.
const shared = ["packages/shared", "packages/db", "packages/design-tokens"];
const runAll = [...touched].some((ws) => shared.includes(ws));

const runs = runAll
  ? [{ label: "monorepo", args: ["-r", "run", "--if-present", "typecheck"] }]
  : [...touched].map((ws) => ({
      label: ws,
      args: ["--dir", ws, "run", "--if-present", "typecheck"],
    }));

const failures = [];
for (const { label, args } of runs) {
  const result = spawnSync("pnpm", args, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
    failures.push({ label, output });
  }
}

if (failures.length === 0) process.exit(0);

let report = failures
  .map(({ label, output }) => `### ${label}\n${output}`)
  .join("\n\n");
if (report.length > MAX_OUTPUT) {
  report = `${report.slice(0, MAX_OUTPUT)}\n... (saída truncada; rode o typecheck localmente para ver tudo)`;
}

const where = failures.map((f) => f.label).join(", ");

if (input.stop_hook_active) {
  process.stderr.write(
    `Typecheck ainda falhando em ${where} depois de uma tentativa de correção. Revise manualmente.\n\n${report}\n`
  );
  process.exit(1);
}

process.stderr.write(
  `Typecheck falhou em ${where}. Corrija os erros de tipo abaixo antes de encerrar o turno, explicando a causa de cada um. Não use "any", "@ts-ignore" nem "@ts-expect-error" para silenciar.\n\n${report}\n`
);
process.exit(2);
