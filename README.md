# Meu ônibus está chegando (web)

Aplicativo web que mostra a previsão de chegada dos ônibus de São Paulo e avisa quando o ônibus escolhido estiver perto do ponto.

Projeto da Global Solution 2026.2, disciplina Application Development (FIAP). Tema do desafio: Citizen Intelligence & Predictive Analytics, monitoramento da cidade para melhorar a qualidade de vida do cidadão.

## O que o app faz

1. **Busca a linha** pelo número ou nome (ex.: `8000`, `Lapa`) e mostra os sentidos disponíveis.
2. **Lista os pontos da linha.** Com a localização do aparelho liberada, ordena os pontos do mais perto para o mais longe. Também dá para filtrar por nome ou endereço.
3. **Mostra os próximos ônibus** daquela linha no ponto escolhido, em minutos, e atualiza sozinho a cada 30 segundos.
4. **Avisa** (mensagem na tela, vibração e notificação do navegador, quando permitido) quando o próximo ônibus estiver a 2, 5 ou 10 minutos.
5. **Mapa** com o ponto, os ônibus da linha em tempo real e a posição do usuário.
6. **Acessibilidade:** veículos acessíveis recebem um selo, os botões são grandes e há um modo de alto contraste.

## Como funciona

```
Navegador (HTML, CSS, JS)  ->  /api/olhovivo (função serverless)  ->  API Olho Vivo (SPTrans)
```

A API Olho Vivo exige um token e um cookie de sessão e não aceita chamadas diretas de páginas web (não envia cabeçalhos CORS). Por isso o navegador fala apenas com a função `api/olhovivo.js`, que:

- guarda o token em uma variável de ambiente (ele nunca aparece no código do navegador nem no GitHub);
- autentica na SPTrans, reaproveita o cookie de sessão e refaz o login se a sessão expirar;
- só aceita um conjunto fixo de consultas de leitura.

### Estrutura

| Caminho | Função |
|---|---|
| `index.html`, `css/style.css` | Página e estilo (responsivo, com modo de alto contraste) |
| `js/main.js` | Fluxo da tela (linha, ponto, painel, aviso) |
| `js/api.js` | Chamadas à função intermediária |
| `js/mapa.js` | Mapa com Leaflet |
| `js/util.js` | Cálculo de distância, minutos até a chegada e textos |
| `api/olhovivo.js` | Função serverless (Vercel) que fala com a SPTrans |
| `dev-server.mjs` | Servidor local para desenvolvimento |

## Como executar

Pré-requisitos: Node.js 20 ou superior e um token da API Olho Vivo (área de desenvolvedores da SPTrans, em "Meus Aplicativos").

```bash
# 1. Crie o arquivo .env com o seu token (use .env.example como modelo)
#    OLHOVIVO_TOKEN=seu_token_aqui

# 2. Rode o servidor local
npm run dev

# 3. Abra http://localhost:3000
```

Para testar só a API, sem o site: `npm run teste-api`.

### Publicação no Vercel

1. Importe o repositório no Vercel (Add New, Project).
2. Em **Settings, Environment Variables**, crie `OLHOVIVO_TOKEN` com o token.
3. Clique em Deploy.

## Créditos e dados

- Dados de linhas, pontos, posições e previsões: **SPTrans, API Olho Vivo** (https://www.sptrans.com.br/desenvolvedores/).
- Mapa: © OpenStreetMap, com a biblioteca Leaflet.

## Integrantes

Veja `PARTICIPANTES.txt`.
