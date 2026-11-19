const MENSAGENS_ERRO = {
  1: "Você não permitiu o acesso à localização. Libere nas configurações do navegador ou busque por endereço.",
  2: "Não foi possível descobrir sua localização agora. Tente de novo ou busque por endereço.",
  3: "A localização demorou demais para responder. Tente de novo ou busque por endereço.",
};

export function obterLocalizacao() {
  return new Promise((resolver, rejeitar) => {
    if (!navigator.geolocation) {
      rejeitar(new Error("Este navegador não oferece localização. Busque por endereço."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolver({ lat: coords.latitude, lon: coords.longitude, rotulo: "Você" }),
      (erro) => rejeitar(new Error(MENSAGENS_ERRO[erro.code] ?? MENSAGENS_ERRO[2])),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  });
}
