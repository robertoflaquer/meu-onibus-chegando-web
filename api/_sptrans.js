// comeca com _ pra nao virar rota no Vercel
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

export async function consultarSptrans(caminho, parametros = {}) {
  const url = new URL(BASE + caminho);
  for (const [chave, valor] of Object.entries(parametros)) url.searchParams.set(chave, valor);

  if (!cookieSessao) await autenticar();
  let resposta = await fetch(url, { headers: { cookie: cookieSessao } });

  // sessao expirou: loga de novo e tenta mais uma vez
  if (resposta.status === 401) {
    await autenticar();
    resposta = await fetch(url, { headers: { cookie: cookieSessao } });
  }
  if (!resposta.ok) throw new Error(`SPTrans respondeu ${resposta.status}`);
  return resposta.json();
}

export async function posicaoGeral() {
  if (cachePosicao.dados && Date.now() - cachePosicao.em < VALIDADE_POSICAO_MS) {
    return cachePosicao.dados;
  }
  const dados = await consultarSptrans("/Posicao");
  cachePosicao = { dados, em: Date.now() };
  return dados;
}
