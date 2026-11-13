// Mapa com Leaflet. Usa marcadores simples (circulos) para nao depender de imagens.

let mapa = null;
let camadaOnibus = null;
let marcadorPonto = null;
let marcadorUsuario = null;

const COR = { ponto: "#c62828", onibus: "#0a5bd8", acessivel: "#0b7a3e", voce: "#6a1b9a" };

function circulo(posicao, cor, raio) {
  return L.circleMarker(posicao, { radius: raio, color: "#ffffff", weight: 2, fillColor: cor, fillOpacity: 1 });
}

function garantirMapa() {
  if (mapa) return;
  mapa = L.map("mapa").setView([-23.55, -46.63], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(mapa);
  camadaOnibus = L.layerGroup().addTo(mapa);
}

/** Chamar quando a secao do mapa ficar visivel, para o Leaflet recalcular o tamanho. */
export function mostrarMapa(ponto) {
  garantirMapa();
  mapa.invalidateSize();
  if (marcadorPonto) marcadorPonto.remove();
  marcadorPonto = circulo([ponto.py, ponto.px], COR.ponto, 10).bindTooltip(ponto.np).addTo(mapa);
  mapa.setView([ponto.py, ponto.px], 15);
}

export function mostrarOnibus(veiculos) {
  garantirMapa();
  camadaOnibus.clearLayers();
  for (const v of veiculos) {
    const cor = v.a ? COR.acessivel : COR.onibus;
    circulo([v.py, v.px], cor, 7)
      .bindTooltip(`Ônibus ${v.p}${v.a ? " (acessível)" : ""}`)
      .addTo(camadaOnibus);
  }
}

export function mostrarUsuario(posicao) {
  garantirMapa();
  if (marcadorUsuario) marcadorUsuario.remove();
  marcadorUsuario = circulo([posicao.lat, posicao.lon], COR.voce, 8).bindTooltip("Você").addTo(mapa);
}
