import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSiteHandler } from "./site.mjs";

describe("production web serving", () => {
  it("serves the build and API from one origin without exposing outside files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "naija-site-"));
    const root = join(dir, "dist");
    await mkdir(join(root, "assets"), { recursive: true });
    await writeFile(join(root, "index.html"), "<html>game</html>");
    await writeFile(join(root, "assets", "game.js"), "console.log('game')");
    await writeFile(join(dir, "secret"), "private");
    const handler = createSiteHandler((_req: any, res: any) => {
      res.writeHead(200);
      res.end("api");
    }, root);
    async function request(url: string, method = "GET") {
      let status = 0,
        headers: any = {},
        body = "";
      await handler(
        { url, method },
        {
          writeHead: (code: number, h: any) => {
            status = code;
            headers = h ?? {};
          },
          end: (data: any) => {
            body = data?.toString() ?? "";
          },
        },
      );
      return { status, headers, body };
    }
    try {
      expect((await request("/")).body).toContain("game");
      expect((await request("/", "HEAD")).body).toBe("");
      const asset = await request("/assets/game.js");
      expect(asset.headers["Content-Type"]).toContain("javascript");
      expect(asset.headers["Cache-Control"]).toContain("immutable");
      expect((await request("/api/me")).body).toBe("api");
      for (const url of ["/..%2fsecret", "/.env", "/assets/missing.js"])
        expect((await request(url)).status).toBe(404);
      expect((await request("/%zz")).status).toBe(400);
      expect((await request("/", "POST")).status).toBe(405);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
