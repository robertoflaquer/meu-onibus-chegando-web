export const $ = (seletor) => document.querySelector(seletor);

export function criar(tag, { classe, texto } = {}, ...filhos) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  elemento.append(...filhos);
  return elemento;
}

export function itemBotao(titulo, detalhe, aoClicar) {
  const botao = criar("button", { classe: "opcao" }, criar("strong", { texto: titulo }), criar("span", { texto: detalhe }));
  botao.type = "button";
  botao.addEventListener("click", aoClicar);
  return criar("li", {}, botao);
}

export function mensagem(seletor, texto) {
  $(seletor).textContent = texto;
}
