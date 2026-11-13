// Servidor local para desenvolvimento: serve os arquivos estaticos e as funcoes da pasta api/,
// imitando o Vercel. Uso: npm run dev  (le o token do arquivo .env)
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";

const PORTA = process.env.PORT || 3000;
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

async function servirFuncao(nome, req, res) {
  const arquivo = join(process.cwd(), "api", `${nome}.js`);
  if (nome.startsWith("_") || !existsSync(arquivo)) {
    res.statusCode = 404;
    return res.end("Funcao nao encontrada");
  }
  const { default: handler } = await import(pathToFileURL(arquivo).href);
  return handler(req, res);
}

async function servirArquivo(caminho, res) {
  const arquivo = normalize(caminho === "/" ? "/index.html" : caminho);
  if (arquivo.includes("..")) {
    res.statusCode = 400;
    return res.end();
  }
  try {
    const conteudo = await readFile(join(process.cwd(), arquivo));
    res.setHeader("Content-Type", TIPOS[extname(arquivo)] || "application/octet-stream");
    res.end(conteudo);
  } catch {
    res.statusCode = 404;
    res.end("Nao encontrado");
  }
}

createServer((req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  const funcao = pathname.match(/^\/api\/([\w-]+)$/);
  if (funcao) return servirFuncao(funcao[1], req, res);
  return servirArquivo(pathname, res);
}).listen(PORTA, () => console.log(`Rodando em http://localhost:${PORTA}`));
