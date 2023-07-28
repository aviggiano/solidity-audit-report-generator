import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

interface Finding {
  id: string;
  file: string;
  line: string;
  description: string;
  [tag: string]: string;
}

const platforms = ["code4rena", "sherlock", "hats", "codehawks"];

function generateXmlReports(context: vscode.ExtensionContext) {
  for (const platform of platforms) {
    let disposable = vscode.commands.registerCommand(
      `solidity-audit-report-generator.${platform}GenerateAuditReport`,
      () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        vscode.window.showInformationMessage(`Generating audit report...`);

        if (!workspaceFolders) {
          vscode.window.showInformationMessage("No workspace is opened.");
          return;
        }

        const dir = workspaceFolders[0].uri.fsPath;
        const findingsDir = path.join(dir, "findings");
        if (!fs.existsSync(findingsDir)) {
          fs.mkdirSync(findingsDir);
        }

        const findings: Finding[] = [];

        workspaceFolders.forEach((folder) => {
          const folderPath = folder.uri.fsPath;
          extractFindings(folderPath, findings);
        });

        findings.map((finding) => {
          const auditCommentsFilePath = path.join(
            findingsDir,
            `${finding.id}.xml`
          );
          const body = Object.keys(finding)
            .map((key) => `<${key}>${finding[key]}</${key}>`)
            .join("\n");
          fs.writeFileSync(auditCommentsFilePath, body, "utf8");
        });
      }
    );

    context.subscriptions.push(disposable);
  }
}

function generateMarkdownReports(context: vscode.ExtensionContext) {
  console.log("TODO");
}

export function activate(context: vscode.ExtensionContext) {
  generateXmlReports(context);
  generateMarkdownReports(context);
}

function extractFindings(dirPath: string, findings: Finding[]): void {
  const AUDIT_ISSUE = "// @audit-issue ";

  fs.readdirSync(dirPath).forEach((file) => {
    const filePath = path.join(dirPath, file);

    if (fs.statSync(filePath).isDirectory()) {
      extractFindings(filePath, findings);
    } else if (path.extname(file) === ".sol") {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const lines = fileContent.split("\n");
      let i = 0;
      lines.forEach((line) => {
        if (!line.trim().startsWith(AUDIT_ISSUE)) {
          i++;
        } else {
          const lineNumber = (i + 1).toString();
          const text = line.trim().replace(AUDIT_ISSUE, "");
          const [id, ...rest] = text.split(" ");
          const [description, ...tagsAndTagsDescriptions] = rest
            .join(" ")
            .split("@");
          const finding: Finding = {
            file,
            line: lineNumber,
            id,
            description,
          };
          tagsAndTagsDescriptions.forEach((tagAndTagDescription) => {
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
