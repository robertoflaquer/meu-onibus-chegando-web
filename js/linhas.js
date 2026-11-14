// Normalizacao das linhas que chegam de endpoints diferentes da API.
//
// /Linha/Buscar devolve: lt (numero), tl (tipo), sl (sentido), tp e ts (terminais).
// /Posicao e /Previsao devolvem: c (letreiro), sl, lt0 e lt1 (terminais).
// Em ambos, sl = 1 vai do terminal principal (tp/lt0) ao secundario (ts/lt1), e sl = 2 volta.
// O app usa um formato unico: { cl, letreiro, sl, origem, destino }.

function comSentido(cl, letreiro, sl, principal, secundario) {
  const ida = sl === 1;
  return { cl, letreiro, sl, origem: ida ? principal : secundario, destino: ida ? secundario : principal };
}

export const linhaDaBusca = (l) => comSentido(l.cl, `${l.lt}-${l.tl}`, l.sl, l.tp, l.ts);

export const linhaDaPosicao = (l) => comSentido(l.cl, l.c, l.sl, l.lt0, l.lt1);

/** Junta os dois sentidos de uma mesma linha em um unico grupo, mantendo a ordem. */
export function agruparPorLetreiro(linhas) {
  const grupos = new Map();
  for (const linha of linhas) {
    if (!grupos.has(linha.letreiro)) grupos.set(linha.letreiro, { letreiro: linha.letreiro, sentidos: [] });
    grupos.get(linha.letreiro).sentidos.push(linha);
  }
  for (const grupo of grupos.values()) grupo.sentidos.sort((a, b) => a.sl - b.sl);
  return [...grupos.values()];
}

/** Ordena grupos: numero exato, depois numero que comeca com o termo, depois o resto. */
export function ordenarPorRelevancia(grupos, termo) {
  const busca = termo.trim().toUpperCase();
  const nota = (grupo) => {
    const numero = grupo.letreiro.split("-")[0];
    if (numero === busca || grupo.letreiro === busca) return 0;
    if (numero.startsWith(busca)) return 1;
    return 2;
  };
  return [...grupos].sort((a, b) => nota(a) - nota(b) || a.letreiro.localeCompare(b.letreiro));
}
