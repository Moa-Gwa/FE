// E2E 전용 정적 파일 서버. BE가 수집할 학사일정 고정 페이지를 제공함
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";

const root = join(import.meta.dirname, "static");
const port = Number(process.env.STATIC_PORT ?? 3101);

createServer(async (req, res) => {
  const path = normalize(new URL(req.url, "http://localhost").pathname).replace(/^(\.\.[/\\])+/, "");
  try {
    const body = await readFile(join(root, path === "/" ? "health.txt" : path));
    res.writeHead(200, { "Content-Type": path.endsWith(".html") ? "text/html; charset=utf-8" : "text/plain" }).end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(port);
