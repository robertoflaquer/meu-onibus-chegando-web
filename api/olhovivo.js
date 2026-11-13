// GET /api/olhovivo?caminho=/Linha/Buscar&termosBusca=8000
// Repassa consultas de leitura para a API Olho Vivo.
// Motivos: a API nao libera CORS para navegadores e exige token + cookie de sessao.
// O token fica na variavel de ambiente OLHOVIVO_TOKEN, nunca no codigo do navegador.

import { consultarSptrans } from "./_sptrans.js";
import { lerParametros, responderJson } from "./_http.js";

// Somente as consultas que o app usa.
const CAMINHOS_PERMITIDOS = new Set([
  "/Linha/Buscar",
  "/Parada/Buscar",
  "/Parada/BuscarParadasPorLinha",
  "/Posicao/Linha",
  "/Previsao/Parada",
  "/Previsao",
]);

export default async function handler(req, res) {
  if (req.method !== "GET") return responderJson(res, 405, { erro: "Metodo nao permitido" });

  const parametros = lerParametros(req);
  const caminho = parametros.get("caminho");
  if (!CAMINHOS_PERMITIDOS.has(caminho)) return responderJson(res, 400, { erro: "Caminho invalido" });

  const repassados = Object.fromEntries([...parametros].filter(([chave]) => chave !== "caminho"));

  try {
    responderJson(res, 200, await consultarSptrans(caminho, repassados));
  } catch {
    responderJson(res, 502, { erro: "Falha ao consultar a SPTrans" });
  }
}
