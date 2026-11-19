const COR = { ponto: "#c62828", onibus: "#0a5bd8", acessivel: "#0b7a3e", referencia: "#6a1b9a" };
const CENTRO_SP = [-23.55, -46.63];

let mapa = null;
let camadaOnibus = null;
let camadaPontos = null;
let marcadorReferencia = null;

export const mapaDisponivel = () => typeof window.L !== "undefined";

function circulo(posicao, cor, raio) {
  return L.circleMarker(posicao, { radius: raio, color: "#ffffff", weight: 2, fillColor: cor, fillOpacity: 1 });
}

export function prepararMapa() {
  if (!mapaDisponivel()) return false;
  if (!mapa) {
    mapa = L.map("mapa").setView(CENTRO_SP, 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(mapa);
    camadaPontos = L.layerGroup().addTo(mapa);
    camadaOnibus = L.layerGroup().addTo(mapa);
  }
  mapa.invalidateSize();
  return true;
}

export function mostrarReferencia(referencia) {
  if (!mapa) return;
  marcadorReferencia?.remove();
  marcadorReferencia = null;
  if (!referencia) return;
  marcadorReferencia = circulo([referencia.lat, referencia.lon], COR.referencia, 9)
    .bindTooltip(referencia.rotulo)
    .addTo(mapa);
}

export function mostrarPontos(pontos, selecionado) {
  if (!mapa) return;
  camadaPontos.clearLayers();
  for (const ponto of pontos) {
    const escolhido = selecionado && ponto.cp === selecionado.cp;
    circulo([ponto.py, ponto.px], COR.ponto, escolhido ? 10 : 5).bindTooltip(ponto.np).addTo(camadaPontos);
  }
}

export function mostrarOnibus(veiculos) {
  if (!mapa) return;
  camadaOnibus.clearLayers();
  for (const v of veiculos) {
    circulo([v.py, v.px], v.a ? COR.acessivel : COR.onibus, 7)
      .bindTooltip(`Ônibus ${v.p}${v.a ? " (acessível)" : ""}`)
      .addTo(camadaOnibus);
  }
}

export function enquadrar(coordenadas) {
  if (!mapa || !coordenadas.length) return;
  if (coordenadas.length === 1) mapa.setView(coordenadas[0], 16);
  else mapa.fitBounds(coordenadas, { padding: [30, 30], maxZoom: 16 });
}
