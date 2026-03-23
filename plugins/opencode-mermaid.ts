import type { Plugin } from "@opencode-ai/plugin";
import { renderMermaidASCII } from "beautiful-mermaid";

const MERMAID_FENCE_REGEX = /(```|~~~)mermaid\b/i;
const MERMAID_BLOCK_REGEX =
  /(^|\n)([ \t]*)(`{3,}|~{3,})mermaid\b[^\n]*\n([\s\S]*?)\n?\2\3(?=\n|$)/gi;
const LABEL_PREFIX = "**Rendered diagram**";
const SECTION_DIVIDER = "---";

function renderDiagramToAscii(mermaidSource: string): string | null {
  try {
    const asciiDiagram = renderMermaidASCII(mermaidSource, {
      colorMode: "none",
    });
    return asciiDiagram.trimEnd();
  } catch {
    return null;
  }
}

function renderMermaidBlocks(text: string): string[] {
  const diagrams: string[] = [];
  const matches = text.matchAll(MERMAID_BLOCK_REGEX);

  for (const match of matches) {
    const diagramSource = String(match[4] ?? "").trim();

    if (diagramSource.length === 0) {
      continue;
    }

    const asciiDiagram = renderDiagramToAscii(diagramSource);

    if (asciiDiagram === null) {
      continue;
    }

    diagrams.push(asciiDiagram);
  }

  return diagrams;
}

function buildDiagramLabel(index: number, totalDiagramCount: number): string {
  const baseLabel = LABEL_PREFIX;

  if (totalDiagramCount > 1) {
    const diagramNumber = index + 1;
    return `${baseLabel} ${diagramNumber}`;
  }

  return baseLabel;
}

function formatSingleDiagram(
  diagram: string,
  index: number,
  totalDiagramCount: number,
): string {
  const label = buildDiagramLabel(index, totalDiagramCount);
  return `${label}:\n\n\`\`\`text\n${diagram}\n\`\`\``;
}

function formatRenderedDiagrams(diagrams: string[]): string {
  const formattedDiagrams = diagrams.map((diagram, index) => {
    return formatSingleDiagram(diagram, index, diagrams.length);
  });

  return formattedDiagrams.join("\n\n");
}

function appendRenderedDiagrams(
  originalText: string,
  diagrams: string[],
): string {
  const trimmedOriginal = originalText.trimEnd();
  const formattedDiagrams = formatRenderedDiagrams(diagrams);
  return `${trimmedOriginal}\n\n${SECTION_DIVIDER}\n\n${formattedDiagrams}`;
}

export const opencodeMermaid: Plugin = async () => {
  return {
    "experimental.text.complete": async (_input, output) => {
      const text = output.text;

      const hasMermaid = MERMAID_FENCE_REGEX.test(text);
      if (!hasMermaid) {
        return;
      }

      const alreadyRendered = text.includes(LABEL_PREFIX);
      if (alreadyRendered) {
        return;
      }

      const diagrams = renderMermaidBlocks(text);

      if (diagrams.length === 0) {
        return;
      }

      output.text = appendRenderedDiagrams(text, diagrams);
    },
  };
};
