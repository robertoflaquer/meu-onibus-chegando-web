import { lerParametros, responderJson } from "./_http.js";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const AREA_SP = "-46.83,-23.35,-46.36,-24.01"; // oeste, norte, leste, sul
const MAX_RESULTADOS = 5;
const cache = new Map();

export default async function handler(req, res) {
  if (req.method !== "GET") return responderJson(res, 405, { erro: "Metodo nao permitido" });

  const consulta = (lerParametros(req).get("q") ?? "").trim();
  if (consulta.length < 3) return responderJson(res, 400, { erro: "Digite pelo menos 3 letras" });

  const chave = consulta.toLowerCase();
  if (cache.has(chave)) return responderJson(res, 200, cache.get(chave));

  const url = new URL(NOMINATIM);
  url.search = new URLSearchParams({
    q: consulta,
    format: "jsonv2",
    countrycodes: "br",
    viewbox: AREA_SP,
    bounded: "1",
    limit: String(MAX_RESULTADOS),
    "accept-language": "pt-BR",
  });

  try {
    const resposta = await fetch(url, {
      headers: { "User-Agent": "MeuOnibusChegando/1.0 (projeto academico)" },
    });
    if (!resposta.ok) throw new Error(`Nominatim respondeu ${resposta.status}`);

    const lugares = (await resposta.json()).map((lugar) => ({
      nome: lugar.display_name.split(", ").slice(0, 3).join(", "),
      lat: Number(lugar.lat),
      lon: Number(lugar.lon),
    }));
    cache.set(chave, lugares);
    responderJson(res, 200, lugares);
  } catch {
    responderJson(res, 502, { erro: "Falha ao buscar o endereco" });
  }
}
