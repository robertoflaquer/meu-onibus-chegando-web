// Cliente da API Olho Vivo usado pelas funcoes serverless.
// Arquivos com "_" no inicio nao viram rotas no Vercel: este e um modulo interno.

const BASE = "https://api.olhovivo.sptrans.com.br/v2.1";
const VALIDADE_POSICAO_MS = 15000;

let cookieSessao = null;
let cachePosicao = { dados: null, em: 0 };

async function autenticar() {
  const token = process.env.OLHOVIVO_TOKEN;
  if (!token) throw new Error("Variavel OLHOVIVO_TOKEN nao configurada");

  const resposta = await fetch(`${BASE}/Login/Autenticar?token=${encodeURIComponent(token.trim())}`, {
    method: "POST",
  });
  const corpo = (await resposta.text()).trim();
  if (corpo !== "true") throw new Error("A SPTrans recusou o token");

  cookieSessao = resposta.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

/** Consulta um caminho da API (ex.: "/Linha/Buscar") e devolve o JSON. */
export async function consultarSptrans(caminho, parametros = {}) {
  const url = new URL(BASE + caminho);
  for (const [chave, valor] of Object.entries(parametros)) url.searchParams.set(chave, valor);

  if (!cookieSessao) await autenticar();
  let resposta = await fetch(url, { headers: { cookie: cookieSessao } });

  // Sessao expirada: autentica de novo e repete a consulta uma vez.
  if (resposta.status === 401) {
    await autenticar();
    resposta = await fetch(url, { headers: { cookie: cookieSessao } });
  }
  if (!resposta.ok) throw new Error(`SPTrans respondeu ${resposta.status}`);
  return resposta.json();
}

/**
 * Posicao de todos os onibus da cidade (cerca de 10 mil veiculos).
 * Guardada por 15 segundos para nao repetir a consulta pesada a cada pedido.
 */
export async function posicaoGeral() {
  if (cachePosicao.dados && Date.now() - cachePosicao.em < VALIDADE_POSICAO_MS) {
    return cachePosicao.dados;
  }
  const dados = await consultarSptrans("/Posicao");
  cachePosicao = { dados, em: Date.now() };
  return dados;
}
