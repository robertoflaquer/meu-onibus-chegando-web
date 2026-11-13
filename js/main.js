// Ponto de entrada: liga a busca ao painel da linha.

import { $ } from "./dom.js";
import { iniciarContraste } from "./contraste.js";
import { iniciarBusca } from "./busca.js";
import { abrirPainel, iniciarPainel } from "./painel.js";

iniciarContraste();

iniciarPainel({
  aoVoltar: () => {
    $("#busca").hidden = false;
  },
});

iniciarBusca((linha, referencia) => {
  $("#busca").hidden = true;
  abrirPainel(linha, referencia);
  window.scrollTo({ top: 0 });
});
