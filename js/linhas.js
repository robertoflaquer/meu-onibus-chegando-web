function comSentido(cl, letreiro, sl, principal, secundario) {
  const ida = sl === 1;
  return { cl, letreiro, sl, origem: ida ? principal : secundario, destino: ida ? secundario : principal };
}

export const linhaDaBusca = (l) => comSentido(l.cl, `${l.lt}-${l.tl}`, l.sl, l.tp, l.ts);

export const linhaDaPosicao = (l) => comSentido(l.cl, l.c, l.sl, l.lt0, l.lt1);

export function agruparPorLetreiro(linhas) {
  const grupos = new Map();
  for (const linha of linhas) {
    if (!grupos.has(linha.letreiro)) grupos.set(linha.letreiro, { letreiro: linha.letreiro, sentidos: [] });
    grupos.get(linha.letreiro).sentidos.push(linha);
  }
  for (const grupo of grupos.values()) grupo.sentidos.sort((a, b) => a.sl - b.sl);
  return [...grupos.values()];
}

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
