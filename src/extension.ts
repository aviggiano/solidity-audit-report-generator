import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as chatgpt from "./chatgpt";
import * as templates from "./templates";
import * as instructions from "./instructions";
import type { Platform } from "./types";

interface Finding {
  id: string;
  file: string;
  line: string;
  description: string;
  [tag: string]: string;
}

function activateGenerateAuditReportCommands(context: vscode.ExtensionContext) {
  const platforms: Platform[] = ["code4rena", "sherlock", "hats", "codehawks"];

  for (const platform of platforms) {
    const command = vscode.commands.registerCommand(
      `solidity-audit-report-generator.${platform}GenerateAuditReport`,
      async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        vscode.window.showInformationMessage(`Generating audit report...`);

        if (!workspaceFolders) {
          vscode.window.showInformationMessage("No workspace is opened.");
          return;
        }

        const dir = workspaceFolders[0].uri.fsPath;
        const reportDir = path.join(dir, "findings");
        if (!fs.existsSync(reportDir)) {
          fs.mkdirSync(reportDir);
        }

        const findings: Finding[] = [];

        workspaceFolders.forEach((folder) => {
          const folderPath = folder.uri.fsPath;
          extractFindings(folderPath, findings);
        });

        findings.map(async (finding) => {
          const xml = Object.keys(finding)
            .map((key) => `<${key}>${finding[key]}</${key}>`)
            .join("\n");
          fs.writeFileSync(
            path.join(reportDir, `${finding.id}.xml`),
            xml,
            "utf8"
          );

          const apiKey = await getApiKey();
          if (apiKey) {
            const prompt = [
              `${instructions.general}${instructions.customInstructions[platform]}\n`,
              `<template>\n${templates[platform]}\n</template>`,
              `<vulnerability-information>\n${xml}\n</vulnerability-information>`,
            ].join("\n");
            fs.writeFileSync(
              path.join(reportDir, `${finding.id}.prompt`),
              prompt,
              "utf8"
            );

            const markdown = await chatgpt.getReport(apiKey, prompt);
            if (markdown) {
              fs.writeFileSync(
                path.join(reportDir, `${finding.id}.md`),
                markdown,
                "utf8"
              );
            }
          }
        });
      }
    );

    context.subscriptions.push(command);
  }
}

function activateRegenerateReportFromPromptCommand(
  context: vscode.ExtensionContext
) {
  const regenerateReportFromPrompt = vscode.commands.registerCommand(
    "solidity-audit-report-generator.regenerateReportFromPrompt",
    async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showInformationMessage("No file is currently open.");
        return;
      }

      const currentFilePath = activeEditor.document.fileName;
      if (!currentFilePath.endsWith(".prompt")) {
        vscode.window.showInformationMessage(
          "The current file does not have the .prompt suffix."
        );
        return;
      }

      vscode.window.showInformationMessage(
        `Regenerating audit report from prompt...`
      );

      const apiKey = await getApiKey();
      if (!apiKey) {
        return;
      }

      const prompt = activeEditor.document.getText();

      const markdown = await chatgpt.getReport(apiKey, prompt);
      if (markdown) {
        fs.writeFileSync(
          currentFilePath.replace(".prompt", ".md"),
          markdown,
          "utf8"
        );
      }
    }
  );

  context.subscriptions.push(regenerateReportFromPrompt);
}

export function activate(context: vscode.ExtensionContext) {
  activateGenerateAuditReportCommands(context);
  activateRegenerateReportFromPromptCommand(context);
}

async function getApiKey(): Promise<string | undefined> {
  const apiKey: string | undefined = vscode.workspace
    .getConfiguration()
    .get("solidity-audit-report-generator.apiKey");

  if (apiKey) {
    return apiKey;
  }

  const value = await vscode.window.showInputBox({
    prompt: "Please enter your OpenAI API key",
    placeHolder: "sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  });
  if (!value) {
    vscode.window.showErrorMessage("You did not enter an API key");
    return undefined;
  } else {
    await vscode.workspace
      .getConfiguration()
      .update(
        "solidity-audit-report-generator.apiKey",
        value,
        vscode.ConfigurationTarget.Global
      );
    return value;
  }
}

function extractFindings(dirPath: string, findings: Finding[]): void {
  const AUDIT = "// @audit";
  const AUDIT_ISSUE = "// @audit-issue ";
  const OFFSET = 10;

  fs.readdirSync(dirPath).forEach((file) => {
    const filePath = path.join(dirPath, file);

    if (fs.statSync(filePath).isDirectory()) {
      extractFindings(filePath, findings);
    } else if (path.extname(file) === ".sol") {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const lines = fileContent.split("\n");
      const original = lines.filter((line) => !line.trim().startsWith(AUDIT));
      let i = 0;
      lines.forEach((line) => {
        if (!line.trim().startsWith(AUDIT)) {
          i++;
        } else if (line.trim().startsWith(AUDIT_ISSUE)) {
          const lineNumber = i + 1;
          const text = line.trim().replace(AUDIT_ISSUE, "");
          const [id, ...rest] = text.split(" ");
          const [description, ...tagsAndTagDescriptions] = rest
            .join(" ")
            .split("@");
          const snippet = [
            "",
            ...original.slice(Math.max(0, lineNumber - OFFSET), lineNumber - 1),
            line,
            ...original.slice(
              lineNumber - 1,
              Math.min(original.length, lineNumber + OFFSET)
            ),
            "",
          ].join("\n");
          const finding: Finding = {
            file,
            line: lineNumber.toString(),
            id,
            description,
            snippet,
          };
          tagsAndTagDescriptions.forEach((tagAndTagDescription) => {
            const [tag, ...tagDescription] = tagAndTagDescription.split(" ");
            finding[tag] = tagDescription.join(" ");
          });
          findings.push(finding);
        }
      });
    }
  });
}

export function deactivate() {}
