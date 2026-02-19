import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerNexrelProductsRoutes } from "../nexrel-products-api";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Nexrel products API (CRM website builder → proxy → here)
  registerNexrelProductsRoutes(app);

  // ElevenLabs signed URL proxy (voice AI)
  app.get("/api/voice/signed-url", async (req, res) => {
    const agentId = req.query.agentId as string;
    const crmUrl = process.env.NEXREL_CRM_URL;
    const secret = process.env.WEBSITE_VOICE_CONFIG_SECRET;
    if (!agentId || !crmUrl) {
      res.status(400).json({ error: "agentId required; NEXREL_CRM_URL not configured" });
      return;
    }
    try {
      const url = `${crmUrl.replace(/\/$/, "")}/api/elevenlabs/signed-url?agentId=${encodeURIComponent(agentId)}`;
      const headers: Record<string, string> = {};
      if (secret) headers["x-website-secret"] = secret;
      const resp = await fetch(url, { headers });
      const data = await resp.json();
      res.status(resp.ok ? 200 : resp.status).json(data);
    } catch (err) {
      console.error("[voice/signed-url]", err);
      res.status(502).json({ error: "Failed to get signed URL" });
    }
  });

  // Website voice lead proxy (forwards to CRM)
  app.post("/api/webhooks/website-voice-lead", async (req, res) => {
    const crmUrl = process.env.NEXREL_CRM_URL;
    const secret = process.env.WEBSITE_VOICE_CONFIG_SECRET || process.env.WEBSITE_SECRET;
    if (!crmUrl) {
      res.status(503).json({ error: "CRM not configured" });
      return;
    }
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (secret) headers["x-website-voice-secret"] = secret;
      const proxyRes = await fetch(`${crmUrl.replace(/\/$/, "")}/api/webhooks/website-voice-lead`, {
        method: "POST",
        headers,
        body: JSON.stringify(req.body),
      });
      const data = await proxyRes.json().catch(() => ({}));
      res.status(proxyRes.status).json(data);
    } catch (err) {
      console.error("[website-voice-lead proxy]", err);
      res.status(502).json({ error: "Failed to forward lead" });
    }
  });

  // E-commerce content from CRM (when NEXREL_CRM_URL + NEXREL_WEBSITE_ID are set)
  app.get("/api/ecommerce-content", async (_req, res) => {
    const crmUrl = process.env.NEXREL_CRM_URL;
    const websiteId = process.env.NEXREL_WEBSITE_ID;
    const secret = process.env.WEBSITE_VOICE_CONFIG_SECRET;
    if (!crmUrl || !websiteId) {
      res.status(503).json({ error: "CRM not configured", products: [], pages: [], videos: [], policies: {} });
      return;
    }
    try {
      const headers: Record<string, string> = {};
      if (secret) headers["x-website-secret"] = secret;
      const resp = await fetch(`${crmUrl.replace(/\/$/, "")}/api/websites/${websiteId}/ecommerce-content`, { headers });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        res.status(resp.status).json(data);
        return;
      }
      res.json(data);
    } catch (err) {
      console.error("[ecommerce-content] CRM fetch failed:", err);
      res.status(502).json({ error: "Failed to fetch content", products: [], pages: [], videos: [], policies: {} });
    }
  });

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
