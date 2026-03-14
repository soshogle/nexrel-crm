export function resolveReliabilityDbUrl(rawInput: string | undefined | null) {
  const raw = String(rawInput || "").trim();
  if (!raw) return "";

  const normalizedRaw = raw
    .replace(/^['"`]+|['"`]+$/g, "")
    .replace(/\\\//g, "/")
    .trim();

  const normalizeCandidate = (candidate: string | undefined) => {
    if (!candidate) return "";
    const cleaned = candidate
      .trim()
      .replace(/^['"`]+|['"`]+$/g, "")
      .replace(/[;,]+$/, "")
      .replace(/\\\//g, "/")
      .trim();

    if (!cleaned) return "";

    if (/^jdbc:postgresql:\/\//i.test(cleaned)) {
      return cleaned.replace(/^jdbc:/i, "");
    }

    if (/^postgres(?:ql)?:\/\//i.test(cleaned)) {
      return cleaned;
    }

    return "";
  };

  const directMatch = normalizedRaw.match(
    /((?:jdbc:)?postgres(?:ql)?:\/\/[^\s'"`]+)/i,
  );
  const directResolved = normalizeCandidate(directMatch?.[1]);
  if (directResolved) return directResolved;

  const assignmentMatch = normalizedRaw.match(
    /(?:^|\s)(?:export\s+)?(?:RELIABILITY_)?DATABASE_URL\s*[:=]\s*([^\s]+)/i,
  );
  const assignmentResolved = normalizeCandidate(assignmentMatch?.[1]);
  if (assignmentResolved) return assignmentResolved;

  return "";
}
