// Funcao serverless (Vercel): intermediaria entre o navegador e a API Olho Vivo.
// Motivos: a API nao libera CORS para navegadores e exige token + cookie de sessao.
// O token fica na variavel de ambiente OLHOVIVO_TOKEN, nunca no codigo do navegador.

const BASE = "https://api.olhovivo.sptrans.com.br/v2.1";

// Somente consultas de leitura que o app usa.
const CAMINHOS_PERMITIDOS = new Set([
  "/Linha/Buscar",
  "/Parada/Buscar",
  "/Parada/BuscarParadasPorLinha",
  "/Posicao/Linha",
  "/Previsao/Parada",
  "/Previsao",
  "/Corredor",
]);

let cookieSessao = null;

async function autenticar() {
  const token = process.env.OLHOVIVO_TOKEN;
  if (!token) throw new Error("Variavel OLHOVIVO_TOKEN nao configurada");

  const resposta = await fetch(`${BASE}/Login/Autenticar?token=${encodeURIComponent(token)}`, {
    method: "POST",
  });
  const corpo = (await resposta.text()).trim();
  if (corpo !== "true") throw new Error("A SPTrans recusou o token");

  cookieSessao = resposta.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

async function consultar(url) {
  if (!cookieSessao) await autenticar();
  let resposta = await fetch(url, { headers: { cookie: cookieSessao } });

  // Sessao expirada: autentica de novo e repete a consulta uma vez.
  if (resposta.status === 401) {
    await autenticar();
    resposta = await fetch(url, { headers: { cookie: cookieSessao } });
  }
  return resposta;
}

function responderJson(res, status, dados) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(dados));
}

export default async function handler(req, res) {
  const entrada = new URL(req.url, "http://localhost");
  const caminho = entrada.searchParams.get("caminho");

  if (req.method !== "GET") return responderJson(res, 405, { erro: "Metodo nao permitido" });
  if (!CAMINHOS_PERMITIDOS.has(caminho)) return responderJson(res, 400, { erro: "Caminho invalido" });

  // Repassa os demais parametros (termosBusca, codigoLinha, codigoParada...).
  const destino = new URL(BASE + caminho);
  for (const [chave, valor] of entrada.searchParams) {
    if (chave !== "caminho") destino.searchParams.set(chave, valor);
  }

  try {
    const resposta = await consultar(destino);
    const texto = await resposta.text();
    if (!resposta.ok) return responderJson(res, 502, { erro: `SPTrans respondeu ${resposta.status}` });
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(texto);
  } catch (erro) {
    responderJson(res, 502, { erro: "Falha ao consultar a SPTrans" });
  }
}
