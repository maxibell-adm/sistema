const CHAVE = 'maxibell.firestore.notificacoes';

export async function listarNotificacoesRemotas() {
  return JSON.parse(localStorage.getItem(CHAVE) || '[]');
}

export async function salvarNotificacaoRemota(notificacao) {
  const atual = await listarNotificacoesRemotas();
  const nova = { id: `${Date.now()}`, criadaEm: new Date().toISOString(), ...notificacao };
  localStorage.setItem(CHAVE, JSON.stringify([nova, ...atual]));
  return nova;
}
