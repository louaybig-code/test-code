import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import http from "http";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3005;
const API_BASE = "https://evalys.admin.preprod.studiolab.fr/smash_api";

// Handle JSON body for custom server endpoints if needed
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Proxy all /smash_api/* requests to http://146.59.230.55/smash_api/*
app.all("/smash_api/*splat", async (req, res) => {
  const targetPath = ((req.params as any).splat as string | string[]) || "";
  const pathStr = Array.isArray(targetPath) ? targetPath.join("/") : targetPath;
  const queryString = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
  const targetUrl = `${API_BASE}/${pathStr}${queryString}`;

  try {
    const headers: Record<string, string> = {};
    if (req.headers.authorization) {
      headers["authorization"] = req.headers.authorization as string;
    }
    if (req.headers["content-type"]) {
      headers["content-type"] = req.headers["content-type"] as string;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      if (req.headers["content-type"]?.includes("multipart/form-data")) {
        // Forward raw request buffer for file uploads
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Buffer);
        }
        fetchOptions.body = Buffer.concat(chunks);
      } else if (req.body && typeof req.body === "object") {
        // Always send body for POST/PUT/PATCH/DELETE if it exists
        fetchOptions.body = JSON.stringify(req.body);
      }
    }

    const response = await fetch(targetUrl, fetchOptions);
    res.status(response.status);

    // Forward response headers
    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("content-type", contentType);
    }

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    console.error("Proxy error:", error);
    res.status(502).json({
      success: false,
      error: { code: "BAD_GATEWAY", message: error?.message || "Error proxying request to Smash API" },
    });
  }
});

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    // Serve static assets under /agile/
    app.use("/agile", express.static(distPath));
    // All /agile/* routes serve index.html for client-side routing (Express 5 compatible)
    app.get("/agile/*path", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    // Root redirect to /agile
    app.get("/", (req, res) => {
      res.redirect("/agile");
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smash server running on http://0.0.0.0:${PORT}`);
  });
}

start();
