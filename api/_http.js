export function lerParametros(req) {
  return new URL(req.url, "http://localhost").searchParams;
}

export function responderJson(res, status, dados) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(dados));
}

export function lerNumero(parametros, nome) {
  const texto = parametros.get(nome);
  if (texto === null || texto.trim() === "") return null;
  const valor = Number(texto);
  return Number.isFinite(valor) ? valor : null;
}
