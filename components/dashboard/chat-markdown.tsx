"use client";

/**
 * Lightweight markdown renderer for chat messages.
 * Handles **bold**, *italic*, and newlines without external dependencies.
 */
export function ChatMarkdown({ content }: { content: string }) {
  const parts = splitMarkdown(content);
  return (
    <span className="text-sm leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.type === "bold") return <strong key={i}>{part.text}</strong>;
        return <span key={i}>{part.text}</span>;
      })}
    </span>
  );
}

type Part = { type: "text" | "bold"; text: string };

function splitMarkdown(text: string): Part[] {
  const result: Part[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        result.push({ type: "text", text: remaining.slice(0, boldMatch.index) });
      }
      result.push({ type: "bold", text: boldMatch[1] });
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
    } else {
      result.push({ type: "text", text: remaining });
      break;
    }
  }
  return result;
}
