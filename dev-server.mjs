// Servidor local para desenvolvimento: serve os arquivos estaticos e a funcao /api/olhovivo.
// Uso: npm run dev  (le o token do arquivo .env)
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import handler from "./api/olhovivo.js";

const PORTA = process.env.PORT || 3000;
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  if (pathname === "/api/olhovivo") return handler(req, res);

  const arquivo = normalize(pathname === "/" ? "/index.html" : pathname);
  if (arquivo.includes("..")) { res.statusCode = 400; return res.end(); }
  try {
    const conteudo = await readFile(join(process.cwd(), arquivo));
    res.setHeader("Content-Type", TIPOS[extname(arquivo)] || "application/octet-stream");
    res.end(conteudo);
  } catch {
    res.statusCode = 404;
    res.end("Nao encontrado");
  }
}).listen(PORTA, () => console.log(`Rodando em http://localhost:${PORTA}`));
