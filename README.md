# solidity-audit-report-generator

The Solidity Audit Report Generator is a VS Code extension that automatically generates audit reports based on contest templates, ChatGPT, and `// @audit` comments

## Features

This extension provides the following key functionalities:

1. Reads `.sol` Solidity files in your workspace and scans for comments starting with `// @audit-issue`. You can add additional information using `@` tags, such as `@recommendation`, `@references`, and any other you like. These will be added to the prompt that will generate the report.

![Example @audit comment](images/example.png)

2. Combines these comments with audit contest templates and uses ChatGPT to generate a detailed audit report.

![Markdown file with report](images/markdown.png)

3. Outputs a XML containing the extracted information from your findings, including additional `@` tags from your issue description, a ChatGPT prompt file used to query OpenAI's API, and a markdown file containing the generated report.

![XML file with vulnerability information](images/xml.png)
![ChatGPT prompt file](images/prompt.png)

4. Regenerates a report in case the user wants to change the ChatGPT prompt.

![ChatGPT updated prompt file](images/regenerate.png)
![Markdown file report updated](images/french.png)


5. Generates a report summary

![Report summary](images/summary.png)

6. Generates a finding from predefined issues

![Tags usage](images/tags.png)

> Tip: This extension is best paired with [Solidity Visual Developer](https://marketplace.visualstudio.com/items?itemName=tintinweb.solidity-visual-auditor) by ConsenSys Diligence.

## Requirements

This extension does not have any specific requirements or dependencies.

## Extension Settings

This extension contributes the following settings:

* `solidity-audit-report-generator.apiKey`: This setting allows you to enter your OpenAI API key required to query ChatGPT for the report generation.

## Known Issues

No known issues at this time.

## Release Notes

| Version | Release Notes |
| --- | --- |
| 0.0.7 | Sort report summary by severity and issue Id |
| 0.0.6 | Add tags feature to generate report from predefined issues |
| 0.0.5 | Include "Audit: Generate Audit Summary" command that creates a summary.md file with a markdown table of findings |
| 0.0.4 | Upgraded VSCode semver to ^1.70.0 per some users not being able to install about 1.80+ being too strict. Included Activation Events |
| 0.0.3 | Improve documentation |
| 0.0.2 | Add extension icon |
| 0.0.1 | Initial release of Solidity Audit Report Generator |
