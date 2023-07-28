import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

interface Finding {
  id: string;
  file: string;
  line: string;
  description: string;
  recommendation?: string;
  references?: string;
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "solidity-audit-report-generator.generateAuditReport",
    () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;

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
        findAuditIssues(folderPath, findings);
      });

      findings.map((finding) => {
        const auditCommentsFilePath = path.join(
          findingsDir,
          `${finding.id}.xml`
        );
        vscode.window.showInformationMessage(`Finding ${finding.id} saved`);
        console.log(finding);
        const body = [
          `<file>${finding.file}</file>`,
          `<line>${finding.line}</line>`,
          `<description>${finding.description}</description>`,
          finding.recommendation
            ? `<recommendation>${finding.recommendation}</recommendation>`
            : undefined,
          finding.references
            ? `<references>${finding.references}</references>`
            : undefined,
        ]
          .filter((x) => x)
          .join("\n");
        fs.writeFileSync(auditCommentsFilePath, body, "utf8");
      });
    }
  );

  context.subscriptions.push(disposable);
}

function findAuditIssues(dirPath: string, findings: Finding[]): void {
  const AUDIT_ISSUE = "// @audit-issue ";

  fs.readdirSync(dirPath).forEach((file) => {
    const filePath = path.join(dirPath, file);

    if (fs.statSync(filePath).isDirectory()) {
      findAuditIssues(filePath, findings);
    } else if (path.extname(file) === ".sol") {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const lines = fileContent.split("\n");
      lines.forEach((line, i) => {
        if (line.trim().startsWith(AUDIT_ISSUE)) {
          const text = line.trim().replace(AUDIT_ISSUE, "");
          const match = text.match(
            /(.*)[ @recommendation (.*)[ @references (.*)]?]?/
          );
          if (!match) {
            console.log(text);
            return;
          }
          const [, idAndDescription, recommendation, references] =
            match as string[];
          const [id, ...desc] = idAndDescription.split(" ");
          const description = desc.join(" ");
          const lineNumber = (i + 1 + 1).toString();
          findings.push({
            file,
            line: lineNumber,
            id,
            description,
            recommendation,
            references,
          });
        }
      });
    }
  });
}

export function deactivate() {}
