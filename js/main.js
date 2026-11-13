import * as api from "./api.js";
import { distanciaM, formatarDistancia, letreiro, minutosAte, nomeSentido, textoMinutos } from "./util.js";
import { mostrarMapa, mostrarOnibus, mostrarUsuario } from "./mapa.js";

const INTERVALO_MS = 30000;
const MAX_PONTOS_NA_LISTA = 30;

const $ = (seletor) => document.querySelector(seletor);

const estado = {
  linha: null,
  paradas: [],
  parada: null,
  usuario: null,
  temporizador: null,
  jaAvisados: new Set(),
};

// ---------- Alto contraste ----------

function aplicarContraste(ativo) {
  document.documentElement.dataset.contraste = ativo ? "alto" : "normal";
  $("#btn-contraste").setAttribute("aria-pressed", String(ativo));
  try {
    localStorage.setItem("contraste", ativo ? "alto" : "normal");
  } catch {
    // sem armazenamento disponivel: a preferencia vale so nesta visita
  }
}

$("#btn-contraste").addEventListener("click", () => {
  aplicarContraste(document.documentElement.dataset.contraste !== "alto");
});
try {
  aplicarContraste(localStorage.getItem("contraste") === "alto");
} catch {
  // ignora
}

// ---------- Passo 1: linha ----------

$("#form-linha").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const termo = $("#busca-linha").value.trim();
  if (!termo) return;

  $("#msg-linha").textContent = "Buscando...";
  $("#lista-linhas").replaceChildren();
  try {
    const linhas = await api.buscarLinhas(termo);
    $("#msg-linha").textContent = linhas.length
      ? `${linhas.length} linha(s) encontrada(s). Escolha o sentido:`
      : "Nenhuma linha encontrada. Tente outro número ou nome.";
    renderizarLinhas(linhas);
  } catch {
    $("#msg-linha").textContent = "Não foi possível consultar a SPTrans agora. Tente de novo.";
  }
});

function criarItemBotao(titulo, subtitulo, aoClicar) {
  const botao = document.createElement("button");
  botao.type = "button";
  const forte = document.createElement("strong");
  forte.textContent = titulo;
  const detalhe = document.createElement("span");
  detalhe.textContent = subtitulo;
  botao.append(forte, detalhe);
  botao.addEventListener("click", aoClicar);
  const li = document.createElement("li");
  li.append(botao);
  return li;
}

function renderizarLinhas(linhas) {
  const itens = linhas.map((linha) =>
    criarItemBotao(letreiro(linha), nomeSentido(linha), () => escolherLinha(linha))
  );
  $("#lista-linhas").replaceChildren(...itens);
}

// ---------- Passo 2: ponto ----------

async function escolherLinha(linha) {
  pararAtualizacao();
  estado.linha = linha;
  estado.parada = null;
  $("#painel").hidden = true;
  $("#passo-ponto").hidden = false;
  $("#linha-escolhida").textContent = `${letreiro(linha)}: ${nomeSentido(linha)}`;
  $("#msg-ponto").textContent = "Carregando os pontos da linha...";
  $("#lista-pontos").replaceChildren();
  $("#filtro-ponto").value = "";
  $("#passo-ponto").scrollIntoView({ behavior: "smooth" });

  try {
    estado.paradas = await api.paradasDaLinha(linha.cl);
    $("#msg-ponto").textContent = `${estado.paradas.length} pontos nesta linha.`;
    renderizarPontos();
  } catch {
    $("#msg-ponto").textContent = "Não foi possível carregar os pontos. Tente de novo.";
  }
}

function pontosFiltrados() {
  const filtro = $("#filtro-ponto").value.trim().toLowerCase();
  let pontos = estado.paradas.map((p) => ({
    ...p,
    distancia: estado.usuario ? distanciaM(estado.usuario, { lat: p.py, lon: p.px }) : null,
  }));
  if (filtro) {
    pontos = pontos.filter((p) => `${p.np} ${p.ed}`.toLowerCase().includes(filtro));
  }
  if (estado.usuario) pontos.sort((a, b) => a.distancia - b.distancia);
  return pontos.slice(0, MAX_PONTOS_NA_LISTA);
}

function renderizarPontos() {
  const itens = pontosFiltrados().map((ponto) => {
    const distancia = ponto.distancia != null ? ` (a ${formatarDistancia(ponto.distancia)})` : "";
    return criarItemBotao(
      ponto.np || "Ponto sem nome",
      `${ponto.ed || "Endereço não informado"}${distancia}`,
      () => escolherPonto(ponto)
    );
  });
  $("#lista-pontos").replaceChildren(...itens);
}

$("#filtro-ponto").addEventListener("input", renderizarPontos);

$("#btn-proximo").addEventListener("click", () => {
  if (!navigator.geolocation) {
    $("#msg-ponto").textContent = "Este navegador não oferece localização. Use o filtro por nome.";
    return;
  }
  $("#msg-ponto").textContent = "Obtendo sua localização...";
  navigator.geolocation.getCurrentPosition(
    (posicao) => {
      estado.usuario = { lat: posicao.coords.latitude, lon: posicao.coords.longitude };
      $("#msg-ponto").textContent = "Pontos ordenados pela distância até você:";
      renderizarPontos();
    },
    () => {
      $("#msg-ponto").textContent =
        "Sem permissão de localização. Libere o acesso no navegador ou use o filtro por nome.";
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// ---------- Passo 3: painel de previsao ----------

function escolherPonto(ponto) {
  pararAtualizacao();
  estado.parada = ponto;
  estado.jaAvisados.clear();
  $("#ponto-escolhido").textContent = `${letreiro(estado.linha)} no ponto ${ponto.np}`;
  $("#aviso").hidden = true;
  $("#painel").hidden = false;
  $("#painel").scrollIntoView({ behavior: "smooth" });

  mostrarMapa(ponto);
  if (estado.usuario) mostrarUsuario(estado.usuario);

  atualizar();
  estado.temporizador = setInterval(atualizar, INTERVALO_MS);
}

function pararAtualizacao() {
  clearInterval(estado.temporizador);
  estado.temporizador = null;
}

async function atualizar() {
  const { linha, parada } = estado;
  if (!linha || !parada) return;
  try {
    const [resultado, posicoes] = await Promise.all([
      api.previsao(parada.cp, linha.cl),
      api.posicaoDaLinha(linha.cl),
    ]);
    const hora = resultado.hr;
    const veiculos = (resultado.p?.l ?? [])
      .flatMap((l) => l.vs)
      .map((v) => ({ ...v, minutos: minutosAte(hora, v.t) }))
      .sort((a, b) => a.minutos - b.minutos);

    renderizarPrevisoes(veiculos);
    mostrarOnibus(posicoes.vs ?? []);
    checarAviso(veiculos);
    $("#atualizado").textContent = `Atualizado às ${hora}. A tela atualiza sozinha a cada 30 segundos.`;
  } catch {
    $("#atualizado").textContent = "Não foi possível atualizar agora. Tentando de novo em 30 segundos.";
  }
}

function renderizarPrevisoes(veiculos) {
  if (!veiculos.length) {
    const li = document.createElement("li");
    li.className = "previsao";
    li.textContent = "Sem previsão para esta linha neste ponto no momento.";
    $("#lista-previsoes").replaceChildren(li);
    return;
  }
  const itens = veiculos.map((v) => {
    const li = document.createElement("li");
    li.className = "previsao";

    const minutos = document.createElement("strong");
    minutos.className = "minutos";
    minutos.textContent = textoMinutos(v.minutos);

    const detalhe = document.createElement("div");
    detalhe.className = "detalhe";
    detalhe.textContent = `Chegada às ${v.t} · veículo ${v.p}`;
    if (v.a) {
      const selo = document.createElement("span");
      selo.className = "selo-acessivel";
      selo.textContent = "Acessível";
      detalhe.append(selo);
    }

    li.append(minutos, detalhe);
    return li;
  });
  $("#lista-previsoes").replaceChildren(...itens);
}

// ---------- Aviso quando o onibus estiver perto ----------

$("#min-aviso").addEventListener("change", () => {
  estado.jaAvisados.clear();
  if (Number($("#min-aviso").value) > 0 && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
});

function checarAviso(veiculos) {
  const limite = Number($("#min-aviso").value);
  const proximo = veiculos[0];
  if (!limite || !proximo || proximo.minutos > limite) return;
  if (estado.jaAvisados.has(proximo.p)) return;
  estado.jaAvisados.add(proximo.p);

  const quando = textoMinutos(proximo.minutos).toLowerCase();
  const texto = `Seu ônibus ${letreiro(estado.linha)} está chegando (${quando}) no ponto ${estado.parada.np}.`;
  $("#aviso").textContent = texto;
  $("#aviso").hidden = false;
  navigator.vibrate?.([300, 150, 300]);
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Meu ônibus está chegando", { body: texto });
  }
}
