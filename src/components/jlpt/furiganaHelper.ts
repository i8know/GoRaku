import { sanitizeInline } from "../../lib/ankiText";
import { QuestionItem } from "../../lib/questionPack";
import { renderRubyHtml } from "../../../tools/language/furigana";

function escapeHtmlText(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function underlineFirstTargetOutsideTags(html: string, target: string): string {
  const escapedTarget = escapeHtmlText(target);
  if (!escapedTarget) return html;
  const parts = html.split(/(<[^>]+>)/g);
  let replaced = false;
  return parts
    .map((part) => {
      if (replaced || part.startsWith("<")) return part;
      const idx = part.indexOf(escapedTarget);
      if (idx === -1) return part;
      replaced = true;
      const underlined = `<u class="underline decoration-2 decoration-amber-500 font-bold">${escapedTarget}</u>`;
      return part.slice(0, idx) + underlined + part.slice(idx + escapedTarget.length);
    })
    .join("");
}

export function renderQuestionPrompt(
  question: QuestionItem,
  showFurigana: boolean = true
): string {
  if (question.rubyNodes && question.rubyNodes.length > 0) {
    const htmlContent = renderRubyHtml(question.rubyNodes, showFurigana);
    const target = question.explanation?.targetWord;
    return target ? underlineFirstTargetOutsideTags(htmlContent, target) : htmlContent;
  }

  // Fallback: sanitasi markup inline agar aman dari XSS bila rubyNodes tidak tersedia
  return sanitizeInline(question.prompt);
}

