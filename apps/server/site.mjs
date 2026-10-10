import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};
export function createSiteHandler(
  api,
  root = fileURLToPath(new URL("../web/dist", import.meta.url)),
) {
  root = resolve(root);
  return async (req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname === "/api" || pathname.startsWith("/api/"))
      return api(req, res);
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { Allow: "GET, HEAD" });
      return res.end();
    }
    try {
      const path = decodeURIComponent(pathname);
      const file = resolve(root, "." + (path === "/" ? "/index.html" : path));
      if (
        !file.startsWith(root + sep) ||
        path.split("/").some((part) => part.startsWith("."))
      ) {
        res.writeHead(404);
        return res.end();
      }
      const data = await readFile(file);
      res.writeHead(200, {
        "Content-Type": types[extname(file)] ?? "application/octet-stream",
        "Content-Length": data.length,
        "Cache-Control": path.startsWith("/assets/")
          ? "public, max-age=31536000, immutable"
          : "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "same-origin",
      });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch (error) {
      res.writeHead(error instanceof URIError ? 400 : 404);
      res.end("Not found");
    }
  };
}
