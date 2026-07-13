const CHAVE = 'maxibell.firestore.notificacoes';

export async function listarNotificacoesRemotas() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHAVE) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(CHAVE);
    return [];
  }
}

export async function salvarNotificacaoRemota(notificacao) {
  const atual = await listarNotificacoesRemotas();
  const nova = { id: `${Date.now()}`, criadaEm: new Date().toISOString(), ...notificacao };
  localStorage.setItem(CHAVE, JSON.stringify([nova, ...atual]));
  return nova;
}
