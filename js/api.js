async function obterJson(url) {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`Falha na consulta (${resposta.status})`);
  return resposta.json();
}

const olhoVivo = (caminho, parametros = {}) =>
  obterJson(`/api/olhovivo?${new URLSearchParams({ caminho, ...parametros })}`);

export const buscarLinhas = (termo) => olhoVivo("/Linha/Buscar", { termosBusca: termo });

export const paradasDaLinha = (codigoLinha) => olhoVivo("/Parada/BuscarParadasPorLinha", { codigoLinha });

export const posicaoDaLinha = (codigoLinha) => olhoVivo("/Posicao/Linha", { codigoLinha });

export const previsao = (codigoParada, codigoLinha) => olhoVivo("/Previsao", { codigoParada, codigoLinha });

export const linhasPerto = ({ lat, lon }, raio) =>
  obterJson(`/api/perto?${new URLSearchParams({ lat, lon, raio })}`);

export const buscarEndereco = (texto) => obterJson(`/api/endereco?${new URLSearchParams({ q: texto })}`);
