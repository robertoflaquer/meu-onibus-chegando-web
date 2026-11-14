// Painel de uma linha: onibus em tempo real, distancia ate o usuario, previsao no ponto e avisos.
//
// Duas fontes de aviso:
//   - Distancia: funciona sempre que ha um local de referencia (GPS ou endereco).
//   - Minutos ate o ponto: so quando a SPTrans informa os pontos da linha.

import * as api from "./api.js";
import { $, criar, mensagem } from "./dom.js";
import { obterLocalizacao } from "./localizacao.js";
import { dispararAviso, esconderAviso, pedirPermissaoNotificacao } from "./aviso.js";
import * as mapa from "./mapa.js";
import { distanciaM, formatarDistancia, minutosAte, textoMinutos } from "./util.js";

const INTERVALO_MS = 20000;
const MAX_ONIBUS_NA_LISTA = 5;
const MARGEM_MOVIMENTO_M = 20; // diferencas menores podem ser so imprecisao do GPS
const RAIO_PONTO_AUTOMATICO_M = 800; // escolhe sozinho o ponto mais proximo se estiver ate aqui
const ESCALA_TRILHA_M = 2000; // a trilha visual vai de 2 km ate "voce"

const estado = {
  linha: null,
  referencia: null,
  pontos: [],
  ponto: null,
  temporizador: null,
  enquadrado: false,
  movimento: new Map(), // prefixo do onibus -> { distancia, status }
  jaAvisados: new Set(),
};

export function iniciarPainel({ aoVoltar }) {
  $("#btn-voltar").addEventListener("click", () => {
    fecharPainel();
    aoVoltar();
  });
  $("#btn-localizacao").addEventListener("click", usarMinhaLocalizacao);
  $("#select-ponto").addEventListener("change", escolherPonto);
  $("#aviso-distancia").addEventListener("change", aoMudarAviso);
  $("#aviso-minutos").addEventListener("change", aoMudarAviso);

  // Com a aba escondida nao faz sentido gastar consultas e bateria.
  document.addEventListener("visibilitychange", () => {
    if (!estado.linha) return;
    if (document.hidden) pararAtualizacao();
    else iniciarAtualizacao();
  });
}

export function abrirPainel(linha, referencia) {
  pararAtualizacao();
  Object.assign(estado, { linha, referencia, pontos: [], ponto: null, enquadrado: false });
  estado.movimento.clear();
  estado.jaAvisados.clear();

  esconderAviso();
  $("#painel-titulo").textContent = linha.letreiro;
  $("#painel-destino").textContent = linha.destino;
  $("#painel-origem").textContent = `saindo de ${linha.origem}`;
  $("#btn-localizacao").hidden = Boolean(referencia);
  mensagem("#msg-localizacao", "");
  $("#bloco-minutos").hidden = true;
  $("#lista-onibus").replaceChildren();
  $("#lista-previsoes").replaceChildren();
  mensagem("#destaque-valor", "");
  mensagem("#destaque-texto", "Procurando os ônibus desta linha...");
  $("#destaque-status").hidden = true;
  $("#trilha").hidden = true;
  $("#painel").hidden = false;

  $("#area-mapa").hidden = false;
  $("#area-mapa").hidden = !mapa.prepararMapa();
  mapa.mostrarReferencia(referencia);
  mapa.mostrarPontos([], null);
  mapa.mostrarOnibus([]);

  carregarPontos();
  iniciarAtualizacao();
}

function fecharPainel() {
  pararAtualizacao();
  estado.linha = null;
  $("#painel").hidden = true;
}

function iniciarAtualizacao() {
  pararAtualizacao();
  atualizar();
  estado.temporizador = setInterval(atualizar, INTERVALO_MS);
}

function pararAtualizacao() {
  clearInterval(estado.temporizador);
  estado.temporizador = null;
}

async function usarMinhaLocalizacao() {
  mensagem("#msg-localizacao", "Obtendo sua localização...");
  try {
    estado.referencia = await obterLocalizacao();
  } catch (erro) {
    mensagem("#msg-localizacao", erro.message);
    return;
  }
  $("#btn-localizacao").hidden = true;
  mensagem("#msg-localizacao", "");
  estado.movimento.clear();
  estado.enquadrado = false;
  mapa.mostrarReferencia(estado.referencia);
  preencherPontos();
  atualizar();
}

const quemEsta = () => (estado.referencia.rotulo === "Você" ? "você" : estado.referencia.rotulo);

// ---------- Pontos da linha (quando a SPTrans informa) ----------

async function carregarPontos() {
  const linhaPedida = estado.linha;
  mensagem("#msg-ponto", "Carregando os pontos desta linha...");
  $("#select-ponto").hidden = true;

  let pontos = [];
  try {
    pontos = await api.paradasDaLinha(linhaPedida.cl);
  } catch {
    // sem pontos: o painel continua funcionando pela distancia
  }
  if (estado.linha !== linhaPedida) return; // usuario ja trocou de linha
  estado.pontos = pontos;
  preencherPontos();
}

function preencherPontos() {
  const { pontos, referencia } = estado;
  $("#legenda-ponto").hidden = !pontos.length;
  if (!pontos.length) {
    mensagem("#msg-ponto", "A SPTrans não informa os pontos desta linha. Acompanhe pela distância do ônibus até você, no topo.");
    $("#select-ponto").hidden = true;
    return;
  }

  const ordenados = pontos.map((p) => ({
    ...p,
    distancia: referencia ? distanciaM(referencia, { lat: p.py, lon: p.px }) : null,
  }));
  if (referencia) ordenados.sort((a, b) => a.distancia - b.distancia);

  const opcoes = [new Option("Escolha o ponto onde você vai embarcar", "")];
  for (const p of ordenados) {
    const distancia = p.distancia !== null ? ` (a ${formatarDistancia(p.distancia)})` : "";
    opcoes.push(new Option(`${p.np}${distancia}`, String(p.cp)));
  }
  $("#select-ponto").replaceChildren(...opcoes);
  $("#select-ponto").value = estado.ponto ? String(estado.ponto.cp) : "";
  $("#select-ponto").hidden = false;
  mensagem("#msg-ponto", `${pontos.length} pontos informados pela SPTrans.`);
  mapa.mostrarPontos(pontos, estado.ponto);

  const [maisPerto] = ordenados;
  if (referencia && !estado.ponto && maisPerto.distancia <= RAIO_PONTO_AUTOMATICO_M) {
    $("#select-ponto").value = String(maisPerto.cp);
    escolherPonto();
  }
}

function escolherPonto() {
  const codigo = Number($("#select-ponto").value);
  estado.ponto = estado.pontos.find((p) => p.cp === codigo) ?? null;
  $("#bloco-minutos").hidden = !estado.ponto;
  $("#lista-previsoes").replaceChildren();
  mapa.mostrarPontos(estado.pontos, estado.ponto);
  if (estado.ponto) atualizar();
}

// ---------- Atualizacao periodica ----------

async function atualizar() {
  const { linha, ponto } = estado;
  if (!linha) return;
  try {
    const [posicao, previsao] = await Promise.all([
      api.posicaoDaLinha(linha.cl),
      ponto ? api.previsao(ponto.cp, linha.cl) : null,
    ]);
    if (estado.linha !== linha) return;

    const veiculos = medirVeiculos(posicao.vs ?? []);
    const chegadas = previsao ? lerChegadas(previsao) : [];

    renderizarOnibus(veiculos);
    mapa.mostrarOnibus(veiculos);
    if (estado.ponto) renderizarPrevisoes(chegadas);
    if (!estado.enquadrado) enquadrarMapa(veiculos);
    checarAvisos(veiculos, chegadas);
    mensagem("#atualizado", `Ao vivo · atualizado às ${posicao.hr}, de novo em 20 s`);
  } catch {
    mensagem("#atualizado", "Não foi possível atualizar agora. Tentando de novo em 20 segundos.");
  }
}

/** Calcula a distancia de cada onibus ate a referencia e se ele esta se aproximando. */
function medirVeiculos(lista) {
  const { referencia, movimento } = estado;
  if (!referencia) return lista.map((v) => ({ ...v, distancia: null, status: null }));

  return lista
    .map((v) => {
      const distancia = distanciaM(referencia, { lat: v.py, lon: v.px });
      const registro = movimento.get(v.p);
      let status = registro?.status ?? null;

      if (!registro) {
        movimento.set(v.p, { distancia, status });
      } else if (Math.abs(registro.distancia - distancia) > MARGEM_MOVIMENTO_M) {
        status = distancia < registro.distancia ? "aproximando" : "afastando";
        movimento.set(v.p, { distancia, status });
      }
      return { ...v, distancia, status };
    })
    .sort((a, b) => a.distancia - b.distancia);
}

function lerChegadas(previsao) {
  return (previsao.p?.l ?? [])
    .flatMap((l) => l.vs)
    .map((v) => ({ ...v, minutos: minutosAte(previsao.hr, v.t) }))
    .sort((a, b) => a.minutos - b.minutos);
}

function enquadrarMapa(veiculos) {
  const coordenadas = veiculos.slice(0, 3).map((v) => [v.py, v.px]);
  if (estado.referencia) coordenadas.push([estado.referencia.lat, estado.referencia.lon]);
  if (estado.ponto) coordenadas.push([estado.ponto.py, estado.ponto.px]);
  if (!coordenadas.length) return;
  mapa.enquadrar(coordenadas);
  estado.enquadrado = true;
}

// ---------- Renderizacao ----------

const TEXTO_STATUS = {
  aproximando: "se aproximando",
  afastando: "se afastando",
};

function seloAcessivel() {
  return criar("span", { classe: "selo-acessivel", texto: "Acessível" });
}

function chipStatus(status) {
  return criar("span", { classe: `chip ${status}`, texto: TEXTO_STATUS[status] });
}

function renderizarDestaque(veiculos) {
  const chip = $("#destaque-status");
  chip.hidden = true;
  $("#trilha").hidden = true;

  if (!veiculos.length) {
    mensagem("#destaque-valor", "");
    mensagem("#destaque-texto", "Nenhum ônibus desta linha circulando agora.");
    return;
  }

  if (!estado.referencia) {
    mensagem("#destaque-valor", String(veiculos.length));
    mensagem("#destaque-texto", "ônibus desta linha circulando agora. Use sua localização para saber a que distância estão.");
    return;
  }

  // Prioriza o onibus que vem na direcao do usuario; senao, o mais proximo.
  const alvo = veiculos.find((v) => v.status === "aproximando") ?? veiculos[0];
  mensagem("#destaque-valor", formatarDistancia(alvo.distancia));
  mensagem("#destaque-texto", `até ${quemEsta()}, ônibus ${alvo.p}${alvo.a ? " (acessível)" : ""}`);
  if (TEXTO_STATUS[alvo.status]) {
    chip.className = `chip ${alvo.status}`;
    chip.textContent = TEXTO_STATUS[alvo.status];
    chip.hidden = false;
  }

  // Trilha: o onibus anda da esquerda (2 km ou mais) ate "voce" (direita).
  const fracao = Math.min(alvo.distancia, ESCALA_TRILHA_M) / ESCALA_TRILHA_M;
  $("#trilha-onibus").style.left = `calc((100% - 14px) * ${(1 - fracao).toFixed(3)})`;
  $("#trilha-rotulo").textContent = quemEsta();
  $("#trilha").hidden = false;
}

function renderizarOnibus(veiculos) {
  renderizarDestaque(veiculos);

  if (!veiculos.length) {
    $("#lista-onibus").replaceChildren(criar("li", { classe: "item-onibus", texto: "Nenhum ônibus circulando agora." }));
    return;
  }

  const itens = veiculos.slice(0, MAX_ONIBUS_NA_LISTA).map((v) => {
    const item = criar("li", { classe: "item-onibus" });
    if (v.distancia !== null) item.append(criar("span", { classe: "distancia", texto: formatarDistancia(v.distancia) }));
    item.append(criar("span", { classe: "prefixo", texto: `ônibus ${v.p}` }));
    if (TEXTO_STATUS[v.status]) item.append(chipStatus(v.status));
    if (v.a) item.append(seloAcessivel());
    return item;
  });
  $("#lista-onibus").replaceChildren(...itens);
}

function renderizarPrevisoes(chegadas) {
  if (!chegadas.length) {
    $("#lista-previsoes").replaceChildren(
      criar("li", { classe: "previsao", texto: "Sem previsão para esta linha neste ponto agora." })
    );
    return;
  }
  const itens = chegadas.map((c) => {
    const detalhe = criar("div", { classe: "detalhe", texto: `Chegada às ${c.t} · ônibus ${c.p}` });
    if (c.a) detalhe.append(seloAcessivel());
    return criar("li", { classe: "previsao" }, criar("strong", { classe: "minutos", texto: textoMinutos(c.minutos) }), detalhe);
  });
  $("#lista-previsoes").replaceChildren(...itens);
}

// ---------- Avisos ----------

function aoMudarAviso() {
  estado.jaAvisados.clear();
  const algumAtivo = Number($("#aviso-distancia").value) > 0 || Number($("#aviso-minutos").value) > 0;
  if (algumAtivo) pedirPermissaoNotificacao();
}

function avisarUmaVez(chave, texto) {
  if (estado.jaAvisados.has(chave)) return;
  estado.jaAvisados.add(chave);
  dispararAviso(texto);
}

function checarAvisos(veiculos, chegadas) {
  const { linha, ponto, referencia } = estado;

  const limiteM = Number($("#aviso-distancia").value);
  if (limiteM && referencia) {
    const alvo = veiculos.find((v) => v.status === "aproximando" && v.distancia <= limiteM);
    if (alvo) {
      avisarUmaVez(
        `distancia-${alvo.p}`,
        `O ônibus ${linha.letreiro} está a ${formatarDistancia(alvo.distancia)} de ${quemEsta()} e se aproximando.`
      );
    }
  }

  const limiteMin = Number($("#aviso-minutos").value);
  if (limiteMin && ponto) {
    const alvo = chegadas.find((c) => c.minutos <= limiteMin);
    if (alvo) {
      avisarUmaVez(
        `minutos-${alvo.p}`,
        `O ônibus ${linha.letreiro} chega ao ponto ${ponto.np} em ${textoMinutos(alvo.minutos)}.`
      );
    }
  }
}
