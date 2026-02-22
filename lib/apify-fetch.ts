/**
 * Apify REST API helper — run actors and get dataset items via fetch.
 * Avoids apify-client (and its proxy-agent dependency) for Vercel serverless compatibility.
 * Actor IDs like "owner/actor-name" must use tilde in URL: "owner~actor-name"
 */
function toApifyActorId(id: string): string {
  return id.replace(/\//g, "~");
}

export async function runApifyActorAndGetItems(
  token: string,
  actorId: string,
  input: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const apiActorId = toApifyActorId(actorId);
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${apiActorId}/runs?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  if (!runRes.ok) {
    const err = await runRes.text();
    throw new Error(`Apify run failed: ${runRes.status} ${err}`);
  }
  const runData = (await runRes.json()) as { data: { id: string; status: string } };
  const runId = runData.data.id;

  // Poll until SUCCEEDED (max ~3 min)
  let status = "RUNNING";
  for (let i = 0; i < 36; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${encodeURIComponent(token)}`
    );
    const statusData = (await statusRes.json()) as { data: { status: string } };
    status = statusData.data.status;
    if (status === "SUCCEEDED") break;
    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`Apify run ${status}`);
    }
  }
  if (status !== "SUCCEEDED") {
    throw new Error(`Apify run timed out after ~3 min (status: ${status})`);
  }

  const itemsRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${encodeURIComponent(token)}`
  );
  if (!itemsRes.ok) throw new Error(`Apify dataset fetch failed: ${itemsRes.status}`);
  return (await itemsRes.json()) as Record<string, unknown>[];
}
