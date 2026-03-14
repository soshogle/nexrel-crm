export function resolveReliabilityDbUrl(rawInput: string | undefined | null) {
  const raw = String(rawInput || "").trim();
  if (!raw) return "";

  const unquoted = raw.replace(/^['"]+|['"]+$/g, "").trim();
  const directMatch = unquoted.match(/(postgres(?:ql)?:\/\/[^\s'"`]+)/i);
  if (directMatch?.[1]) return directMatch[1];

  const assignmentMatch = unquoted.match(
    /DATABASE_URL\s*=\s*(postgres(?:ql)?:\/\/[^\s'"`]+)/i,
  );
  if (assignmentMatch?.[1]) return assignmentMatch[1];

  return "";
}
