// GET /api/perto?lat=-23.56&lon=-46.65&raio=500
// Linhas com onibus passando perto de um local agora.
// A API Olho Vivo nao busca pontos por coordenada, e a lista de pontos dela e incompleta.
// A posicao dos onibus, porem, e completa: por isso o "perto de mim" parte dela.

import { posicaoGeral } from "./_sptrans.js";
import { lerNumero, lerParametros, responderJson } from "./_http.js";
import { distanciaM } from "../js/util.js";

const RAIO_PADRAO_M = 500;
const RAIO_MAXIMO_M = 2000;
const MAX_LINHAS = 30;

export default async function handler(req, res) {
  if (req.method !== "GET") return responderJson(res, 405, { erro: "Metodo nao permitido" });

  const parametros = lerParametros(req);
  const lat = lerNumero(parametros, "lat");
  const lon = lerNumero(parametros, "lon");
  const raio = Math.min(lerNumero(parametros, "raio") ?? RAIO_PADRAO_M, RAIO_MAXIMO_M);

  if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return responderJson(res, 400, { erro: "Informe lat e lon validos" });
  }

  try {
    const posicao = await posicaoGeral();
    const local = { lat, lon };

    const linhas = (posicao.l ?? [])
      .map((linha) => {
        const veiculos = linha.vs
          .map((v) => ({ p: v.p, a: v.a, py: v.py, px: v.px, distancia: Math.round(distanciaM(local, { lat: v.py, lon: v.px })) }))
          .filter((v) => v.distancia <= raio)
          .sort((a, b) => a.distancia - b.distancia);
        return { c: linha.c, cl: linha.cl, sl: linha.sl, lt0: linha.lt0, lt1: linha.lt1, veiculos };
      })
      .filter((linha) => linha.veiculos.length > 0)
      .sort((a, b) => a.veiculos[0].distancia - b.veiculos[0].distancia)
      .slice(0, MAX_LINHAS);

    responderJson(res, 200, { hr: posicao.hr, raio, linhas });
  } catch {
    responderJson(res, 502, { erro: "Falha ao consultar a SPTrans" });
  }
}
