// Tela de busca: tres formas de chegar a uma linha.
//   1. Perto de mim: GPS -> linhas com onibus passando perto agora.
//   2. Endereco: texto -> coordenadas (Nominatim) -> linhas com onibus passando perto.
//   3. Linha: numero ou destino -> linhas agrupadas por letreiro, com os dois sentidos.

import * as api from "./api.js";
import { $, criar, itemBotao, mensagem } from "./dom.js";
import { agruparPorLetreiro, linhaDaBusca, linhaDaPosicao, ordenarPorRelevancia } from "./linhas.js";
import { obterLocalizacao } from "./localizacao.js";
import { formatarDistancia } from "./util.js";

const POR_PAGINA = 8;
const RAIOS_BUSCA_M = [500, 1000]; // tenta perto primeiro e amplia se nao achar nada

let aoEscolherLinha = () => {};
let referencia = null; // ultimo local usado na busca (GPS ou endereco)
let paginacao = { itens: [], mostrados: 0, criarItem: null };

export function iniciarBusca(callback) {
  aoEscolherLinha = callback;
  document.querySelectorAll("[data-modo]").forEach((aba) => {
    aba.addEventListener("click", () => trocarModo(aba.dataset.modo));
  });
  $("#btn-perto").addEventListener("click", buscarPertoDeMim);
  $("#form-endereco").addEventListener("submit", buscarPorEndereco);
  $("#form-linha").addEventListener("submit", buscarPorLinha);
  $("#btn-mais").addEventListener("click", mostrarMais);
  trocarModo("perto");
}

const descreverLocal = (local) => (local.rotulo === "Você" ? "você" : local.rotulo);

function escolher(linha) {
  aoEscolherLinha(linha, referencia);
}

// ---------- Abas e resultados ----------

function trocarModo(modo) {
  document.querySelectorAll("[data-modo]").forEach((aba) => {
    aba.setAttribute("aria-selected", String(aba.dataset.modo === modo));
  });
  $("#modo-perto").hidden = modo !== "perto";
  $("#form-endereco").hidden = modo !== "endereco";
  $("#form-linha").hidden = modo !== "linha";
  limparResultados();
}

function limparResultados(texto = "") {
  mensagem("#msg-busca", texto);
  $("#resultados").replaceChildren();
  $("#btn-mais").hidden = true;
}

function paginar(itens, criarItem) {
  paginacao = { itens, mostrados: 0, criarItem };
  $("#resultados").replaceChildren();
  mostrarMais();
}

function mostrarMais() {
  const { itens, mostrados, criarItem } = paginacao;
  const proximos = itens.slice(mostrados, mostrados + POR_PAGINA);
  $("#resultados").append(...proximos.map(criarItem));
  paginacao.mostrados += proximos.length;
  $("#btn-mais").hidden = paginacao.mostrados >= itens.length;
}

// ---------- 1 e 2: linhas perto de um local ----------

async function buscarPertoDeMim() {
  limparResultados("Obtendo sua localização...");
  try {
    referencia = await obterLocalizacao();
  } catch (erro) {
    limparResultados(erro.message);
    return;
  }
  await listarLinhasPerto();
}

async function listarLinhasPerto() {
  mensagem("#msg-busca", "Procurando ônibus por perto...");
  try {
    for (const raio of RAIOS_BUSCA_M) {
      const { linhas } = await api.linhasPerto(referencia, raio);
      if (linhas.length) {
        mensagem(
          "#msg-busca",
          `${linhas.length} linha(s) com ônibus a até ${formatarDistancia(raio)} de ${descreverLocal(referencia)}. Escolha a sua:`
        );
        paginar(linhas, itemLinhaPerto);
        return;
      }
    }
    limparResultados("Nenhum ônibus a até 1 km neste momento. Tente outro endereço ou busque pela linha.");
  } catch {
    limparResultados("Não foi possível consultar a SPTrans agora. Tente de novo.");
  }
}

function itemLinhaPerto(dados) {
  const linha = linhaDaPosicao(dados);
  const [maisPerto] = dados.veiculos;
  const outros = dados.veiculos.length > 1 ? ` · ${dados.veiculos.length} por perto` : "";
  const detalhe = `Sentido ${linha.destino} · ônibus a ${formatarDistancia(maisPerto.distancia)}${outros}`;
  return itemBotao(linha.letreiro, detalhe, () => escolher(linha));
}

async function buscarPorEndereco(evento) {
  evento.preventDefault();
  const texto = $("#campo-endereco").value.trim();
  if (texto.length < 3) {
    limparResultados("Digite pelo menos 3 letras.");
    return;
  }
  limparResultados("Procurando o endereço...");
  try {
    const lugares = await api.buscarEndereco(texto);
    if (!lugares.length) {
      limparResultados("Endereço não encontrado em São Paulo. Inclua o bairro ou um ponto de referência.");
      return;
    }
    if (lugares.length === 1) {
      escolherLugar(lugares[0]);
      return;
    }
    mensagem("#msg-busca", "Qual destes lugares?");
    paginar(lugares, (lugar) => itemBotao(lugar.nome.split(", ")[0], lugar.nome, () => escolherLugar(lugar)));
  } catch {
    limparResultados("Não foi possível buscar o endereço agora. Tente de novo.");
  }
}

function escolherLugar(lugar) {
  referencia = { lat: lugar.lat, lon: lugar.lon, rotulo: lugar.nome.split(", ")[0] };
  limparResultados();
  listarLinhasPerto();
}

// ---------- 3: busca pelo numero ou destino da linha ----------

async function buscarPorLinha(evento) {
  evento.preventDefault();
  const termo = $("#campo-linha").value.trim();
  if (!termo) return;

  limparResultados("Buscando...");
  try {
    const linhas = (await api.buscarLinhas(termo)).map(linhaDaBusca);
    if (!linhas.length) {
      limparResultados("Nenhuma linha encontrada. Tente o número (ex.: 875A) ou um terminal (ex.: Lapa).");
      return;
    }
    const grupos = ordenarPorRelevancia(agruparPorLetreiro(linhas), termo);
    mensagem("#msg-busca", `${grupos.length} linha(s) encontrada(s). Escolha o sentido:`);
    paginar(grupos, itemGrupoLinha);
  } catch {
    limparResultados("Não foi possível consultar a SPTrans agora. Tente de novo.");
  }
}

function itemGrupoLinha(grupo) {
  const [primeiro] = grupo.sentidos;
  const botoes = grupo.sentidos.map((linha) => {
    const botao = criar("button", { classe: "sentido", texto: `Sentido ${linha.destino}` });
    botao.type = "button";
    botao.addEventListener("click", () => escolher(linha));
    return botao;
  });
  return criar(
    "li",
    { classe: "grupo-linha" },
    criar("strong", { texto: grupo.letreiro }),
    criar("span", { classe: "detalhe", texto: `${primeiro.origem} ⇄ ${primeiro.destino}` }),
    criar("div", { classe: "sentidos" }, ...botoes)
  );
}
