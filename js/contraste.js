// Modo de alto contraste, lembrado entre visitas quando o navegador permite.

import { $ } from "./dom.js";

function aplicar(ativo) {
  document.documentElement.dataset.contraste = ativo ? "alto" : "normal";
  $("#btn-contraste").setAttribute("aria-pressed", String(ativo));
  try {
    localStorage.setItem("contraste", ativo ? "alto" : "normal");
  } catch {
    // sem armazenamento: a preferencia vale so nesta visita
  }
}

export function iniciarContraste() {
  let salvo = false;
  try {
    salvo = localStorage.getItem("contraste") === "alto";
  } catch {
    // ignora
  }
  aplicar(salvo);
  $("#btn-contraste").addEventListener("click", () => {
    aplicar(document.documentElement.dataset.contraste !== "alto");
  });
}
