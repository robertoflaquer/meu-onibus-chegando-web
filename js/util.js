// Funcoes puras de apoio (sem acesso a tela nem a rede).
// Tambem sao usadas pela funcao serverless api/perto.js.

const RAIO_TERRA_M = 6371000;
const paraRadianos = (graus) => (graus * Math.PI) / 180;

/** Distancia em metros entre dois pontos {lat, lon} (formula de Haversine). */
export function distanciaM(a, b) {
  const dLat = paraRadianos(b.lat - a.lat);
  const dLon = paraRadianos(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(paraRadianos(a.lat)) * Math.cos(paraRadianos(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_TERRA_M * Math.asin(Math.sqrt(h));
}

const paraMinutosDoDia = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Minutos entre a hora da consulta ("hr") e a hora prevista de chegada ("t").
 * Usa a hora devolvida pela propria SPTrans, assim o relogio do aparelho nao interfere.
 */
export function minutosAte(horaConsulta, horaChegada) {
  let diferenca = paraMinutosDoDia(horaChegada) - paraMinutosDoDia(horaConsulta);
  if (diferenca < 0) diferenca += 24 * 60; // passou da meia-noite
  return diferenca;
}

export function formatarDistancia(metros) {
  return metros < 1000 ? `${Math.round(metros / 10) * 10} m` : `${(metros / 1000).toFixed(1)} km`;
}

export function textoMinutos(min) {
  if (min <= 0) return "chegando";
  return min === 1 ? "1 min" : `${min} min`;
}
