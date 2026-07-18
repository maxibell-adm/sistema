const CHAVE = 'maxibell.precadastros';
const CHAVE_LEMBRETES = 'maxibell.lembretes.app';
const MAX_REGISTROS = 30;
const DIAS_AVISO = 5;
const DIAS_EXPIRACAO = 20;

function lerTodos() {
  try {
    const raw = localStorage.getItem(CHAVE);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function salvarTodos(lista) {
  localStorage.setItem(CHAVE, JSON.stringify(lista.slice(0, MAX_REGISTROS)));
}

export function listarPreCadastros() {
  return lerTodos().sort((a, b) => new Date(b.geradoEm) - new Date(a.geradoEm));
}

export function buscarPreCadastro(pp) {
  return lerTodos().find((p) => p.pp === pp) || null;
}

export function ppJaEObra(pp, obras) {
  return (obras || []).some((o) => o.pp === pp);
}

export function salvarPreCadastro(dados, obras) {
  if (ppJaEObra(dados.pp, obras)) return { salvo: false, motivo: 'obra_existente' };
  const lista = lerTodos().filter((p) => p.pp !== dados.pp);
  const novo = { ...dados, id: String(Date.now()), geradoEm: new Date().toISOString(), expiracaoAviso: false };
  salvarTodos([novo, ...lista]);
  return { salvo: true, pp: dados.pp };
}

export function removerPreCadastro(pp) {
  salvarTodos(lerTodos().filter((p) => p.pp !== pp));
  concluirLembrete(pp);
}

export function concluirLembrete(pp) {
  try {
    const lembretes = JSON.parse(localStorage.getItem(CHAVE_LEMBRETES) || '[]');
    const atualizados = lembretes.map((l) => (l.precadastroPP === pp ? { ...l, concluido: true } : l));
    localStorage.setItem(CHAVE_LEMBRETES, JSON.stringify(atualizados));
  } catch {}
}

export function verificarExpiracoes(obras) {
  const agora = new Date();
  const lista = lerTodos();
  let modificado = false;
  const atualizada = lista.filter((pc) => {
    const diasDesde = Math.floor((agora - new Date(pc.geradoEm)) / 86400000);
    if (diasDesde >= DIAS_EXPIRACAO) {
      concluirLembrete(pc.pp);
      modificado = true;
      return false;
    }
    if (diasDesde >= DIAS_AVISO && !pc.expiracaoAviso && !ppJaEObra(pc.pp, obras)) {
      try {
        const lembretes = JSON.parse(localStorage.getItem(CHAVE_LEMBRETES) || '[]');
        lembretes.unshift({
          id: `contrato-aviso-${pc.pp}-${Date.now()}`,
          titulo: `Contrato ${pc.pp} sem cadastro de obra`,
          descricao: `Contrato ${pc.pp} gerado há ${diasDesde} dias sem cadastro de obra. Verificar assinatura do cliente.`,
          responsavel: pc.responsavel || 'Ana',
          precadastroPP: pc.pp,
          tag: 'comercial',
          concluido: false,
          criadoEm: agora.toISOString(),
        });
        localStorage.setItem(CHAVE_LEMBRETES, JSON.stringify(lembretes));
      } catch {}
      pc.expiracaoAviso = true;
      modificado = true;
    }
    return true;
  });
  if (modificado) salvarTodos(atualizada);
}
