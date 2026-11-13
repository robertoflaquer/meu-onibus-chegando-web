# Meu ônibus está chegando (web)

Aplicativo web que mostra quais ônibus estão passando perto de você em São Paulo, acompanha a linha escolhida em tempo real e avisa quando o ônibus estiver chegando.

Projeto da Global Solution 2026.2, disciplina Application Development (FIAP). Tema do desafio: Citizen Intelligence & Predictive Analytics, monitoramento da cidade para melhorar a qualidade de vida do cidadão.

## O que o app faz

**1. Encontrar a linha, de três formas**

| Forma | Como funciona |
|---|---|
| Perto de mim | Usa a localização do aparelho e lista as linhas com ônibus passando a até 500 m (ou 1 km) agora |
| Endereço | Converte o endereço digitado em coordenadas e lista as linhas com ônibus passando perto dali |
| Linha | Busca pelo número ou pelo terminal de destino (ex.: `875A`, `Lapa`), com os dois sentidos agrupados em um só cartão |

**2. Acompanhar a linha escolhida**

- Distância do ônibus mais próximo até você e se ele está se aproximando ou se afastando.
- Mapa com a sua posição, os ônibus da linha e os pontos (quando a SPTrans informa).
- Previsão de chegada em minutos no seu ponto. Se você estiver perto, o ponto mais próximo é escolhido sozinho.
- Atualização automática a cada 20 segundos, pausada quando a aba fica em segundo plano.

**3. Receber o aviso**

- Por distância: quando um ônibus da linha estiver a 300 m, 500 m ou 1 km e se aproximando.
- Por tempo: quando faltarem 2, 5 ou 10 minutos para chegar ao ponto.
- O aviso aparece na tela, vibra o celular e gera uma notificação do navegador, se permitida.

**Acessibilidade:** veículos acessíveis recebem um selo, os botões têm área de toque grande e há um modo de alto contraste.

## Por que o app funciona assim

Testamos a API Olho Vivo antes de definir o fluxo e encontramos limitações que orientaram o projeto:

- **A API não aceita chamadas diretas de páginas web** (não envia cabeçalhos CORS) e exige token e cookie de sessão. Por isso o navegador fala apenas com funções serverless próprias, que guardam o token.
- **A lista de pontos por linha é incompleta**: em uma amostra de 25 linhas, 15 não tinham nenhum ponto cadastrado, e a busca de pontos por nome encontra poucos resultados.
- **A posição dos ônibus é completa**: cerca de 10 mil veículos em tempo real. Por isso a busca "perto de mim" e o aviso por distância partem da posição dos ônibus, e a previsão por ponto aparece como complemento quando os pontos existem.
- **A API não calcula rotas** de um endereço a outro. O app deixa isso claro e oferece a busca por destino.

## Arquitetura

```
Navegador (HTML, CSS, JS)
   |
   |-- /api/olhovivo  -> repassa consultas de leitura à API Olho Vivo
   |-- /api/perto     -> linhas com ônibus perto de uma coordenada (a partir de /Posicao)
   '-- /api/endereco  -> endereço para coordenadas (Nominatim, OpenStreetMap)
```

| Caminho | Função |
|---|---|
| `index.html`, `css/style.css` | Página e estilo (responsivo, com alto contraste) |
| `js/main.js` | Liga a busca ao painel |
| `js/busca.js` | As três formas de busca e a lista de resultados |
| `js/painel.js` | Painel da linha: atualização, distância, previsão e avisos |
| `js/linhas.js` | Normaliza os formatos de linha dos diferentes endpoints e agrupa os sentidos |
| `js/api.js` | Chamadas às funções serverless |
| `js/mapa.js` | Mapa com Leaflet |
| `js/localizacao.js`, `js/aviso.js`, `js/contraste.js`, `js/dom.js` | Localização, avisos, alto contraste e utilitários de tela |
| `js/util.js` | Distância (Haversine), minutos até a chegada e formatação (usado também no servidor) |
| `api/olhovivo.js`, `api/perto.js`, `api/endereco.js` | Funções serverless (Vercel) |
| `api/_sptrans.js`, `api/_http.js` | Sessão com a SPTrans e utilitários HTTP (não são rotas) |
| `dev-server.mjs` | Servidor local que imita o Vercel |

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

- Linhas, posições e previsões: **SPTrans, API Olho Vivo** (https://www.sptrans.com.br/desenvolvedores/).
- Mapa e busca de endereços: © OpenStreetMap (Leaflet e Nominatim).

## Integrantes

Veja `PARTICIPANTES.txt`.
