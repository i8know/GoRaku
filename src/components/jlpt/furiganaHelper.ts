import { QuestionItem } from "../../lib/questionPack";
import { renderRubyHtml } from "../../../tools/language/furigana";

export function renderQuestionPrompt(
  question: QuestionItem,
  showFurigana: boolean = true
): string {
  if (question.rubyNodes && question.rubyNodes.length > 0) {
    const htmlContent = renderRubyHtml(question.rubyNodes, showFurigana);
    const target = question.explanation.targetWord;
    if (target && htmlContent.includes(target)) {
      return htmlContent.replace(
        target,
        `<u class="underline decoration-2 decoration-amber-500 font-bold">${target}</u>`
      );
    }
    return htmlContent;
  }

  // Fallback: gunakan prompt langsung
  return question.prompt;
}

