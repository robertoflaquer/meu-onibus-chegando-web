// Teste local da API Olho Vivo (le o token do .env, nunca imprime o token)
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(".env","utf8").split(/\r?\n/).filter(l=>l.includes("=")).map(l=>l.split(/=(.*)/s).slice(0,2)));
const token = (env.OLHOVIVO_TOKEN||"").trim();
if(!token || token.startsWith("COLE")) { console.log("Falta o token no .env"); process.exit(1); }
const base = "https://api.olhovivo.sptrans.com.br/v2.1";
const login = await fetch(`${base}/Login/Autenticar?token=${token}`, {method:"POST"});
console.log("login status:", login.status, "corpo:", await login.clone().text());
const cookie = (login.headers.getSetCookie?.() || []).map(c=>c.split(";")[0]).join("; ");
console.log("cookie recebido:", cookie ? "sim" : "nao");
const get = async p => (await fetch(base+p,{headers:{cookie}})).json();
const linhas = await get("/Linha/Buscar?termosBusca=8000");
console.log("linhas para '8000':", linhas.length, linhas[0] ? JSON.stringify(linhas[0]) : "");
const paradas = await get("/Parada/Buscar?termosBusca=Paulista");
console.log("paradas para 'Paulista':", paradas.length, paradas[0] ? JSON.stringify(paradas[0]) : "");
if (paradas[0]) {
  const prev = await get(`/Previsao/Parada?codigoParada=${paradas[0].cp}`);
  console.log("previsao:", JSON.stringify(prev).slice(0,400));
}
