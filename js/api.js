// Acesso a API Olho Vivo, sempre pela funcao intermediaria /api/olhovivo.

async function consultar(caminho, parametros = {}) {
  const consulta = new URLSearchParams({ caminho, ...parametros });
  const resposta = await fetch(`/api/olhovivo?${consulta}`);
  if (!resposta.ok) throw new Error(`Falha ao consultar a SPTrans (${resposta.status})`);
  return resposta.json();
}

export const buscarLinhas = (termo) => consultar("/Linha/Buscar", { termosBusca: termo });

export const paradasDaLinha = (codigoLinha) =>
  consultar("/Parada/BuscarParadasPorLinha", { codigoLinha });

export const posicaoDaLinha = (codigoLinha) => consultar("/Posicao/Linha", { codigoLinha });

export const previsao = (codigoParada, codigoLinha) =>
  consultar("/Previsao", { codigoParada, codigoLinha });
