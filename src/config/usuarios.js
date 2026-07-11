const CHAVE_USUARIOS = 'maxibell.config.usuarios';

export const COR_USUARIO = {
  alvaro: 'linear-gradient(135deg,#1A3A5C,#1E5799)',
  andre: 'linear-gradient(135deg,#27AE60,#1e8449)',
  ana: 'linear-gradient(135deg,#8E44AD,#6c3483)',
  matheus: 'linear-gradient(135deg,#E67E22,#ca6f1e)',
  allana: 'linear-gradient(135deg,#2980B9,#1a6fa0)',
  aguinaldo: 'linear-gradient(135deg,#1A3A5C,#0F2538)',
};

export const USUARIOS_PADRAO = [
  { id: 'alvaro', role: 'admin', nome: 'Álvaro', cargo: 'Administrador Geral', email: 'alvaro@maxibell.com.br', cor: '#1A3A5C', avatar: 'AV', ativo: true },
  { id: 'andre', role: 'operacional', nome: 'André', cargo: 'Operacional / PCP', email: 'andre@maxibell.com.br', cor: '#27AE60', avatar: 'AD', ativo: true },
  { id: 'ana', role: 'comercial', nome: 'Ana', cargo: 'Comercial', email: 'ana@maxibell.com.br', cor: '#8E44AD', avatar: 'AN', ativo: true },
  { id: 'matheus', role: 'medicao', nome: 'Matheus', cargo: 'Medição / Técnico', email: 'matheus@maxibell.com.br', cor: '#E67E22', avatar: 'MT', ativo: true },
  { id: 'allana', role: 'projetos', nome: 'Allana', cargo: 'Projetos', email: 'allana@maxibell.com.br', cor: '#2980B9', avatar: 'AL', ativo: true },
  { id: 'u6', role: 'supervisor', nome: 'Aguinaldo', cargo: 'Presidente', email: 'aguinaldo@maxibell.com.br', cor: '#1A3A5C', avatar: 'AG', ativo: true },
];

function mesclarUsuariosPadrao(usuariosSalvos) {
  const salvos = Array.isArray(usuariosSalvos) ? usuariosSalvos : [];
  const porId = new Map(salvos.map((usuario) => [usuario.id, usuario]));
  USUARIOS_PADRAO.forEach((usuario) => {
    if (!porId.has(usuario.id)) porId.set(usuario.id, usuario);
  });
  return Array.from(porId.values());
}

export function carregarUsuarios() {
  try {
    const salvo = localStorage.getItem(CHAVE_USUARIOS);
    const usuarios = salvo ? mesclarUsuariosPadrao(JSON.parse(salvo)) : USUARIOS_PADRAO;
    localStorage.setItem(CHAVE_USUARIOS, JSON.stringify(usuarios));
    return usuarios;
  } catch {
    return USUARIOS_PADRAO;
  }
}

export function salvarUsuarios(usuarios) {
  localStorage.setItem(CHAVE_USUARIOS, JSON.stringify(usuarios));
}

export function usuarioPorRole(role) {
  return carregarUsuarios().find((u) => u.role === role && u.ativo);
}

export function usuarioPorNome(nome) {
  return carregarUsuarios().find((u) => u.nome.toLowerCase() === nome?.toLowerCase() && u.ativo);
}

export function nomeResponsavelEtapa(etapa) {
  const roleMap = {
    pedido_inicial: 'operacional',
    medicao_inicial: 'medicao',
    projeto_contramarco: 'projetos',
    fabricacao_contramarco: 'operacional',
    medicao_final: 'medicao',
    projeto_final: 'projetos',
    compras: 'operacional',
    montagem: 'operacional',
    entrega: 'operacional',
    instalacao: 'operacional',
    manutencao: 'medicao',
    entrega_cm: 'operacional',
    finalizado: null,
  };
  const role = roleMap[etapa];
  if (!role) return null;
  return usuarioPorRole(role)?.nome || role;
}

export const USUARIOS = Object.fromEntries(USUARIOS_PADRAO.map((u) => [u.id, u]));

export const PERMISSOES = {
  admin: { verTodasObras: true, criarObra: true, moverQualquerEtapa: true, editarCompras: true, editarAgenda: true, agendarMedicao: true, agendarManutencao: true, aprovarAutomacao: true, verIndicadores: true, acessarBiblioteca: true, verFinanceiro: true },
  supervisor: { verTodasObras: true, criarObra: false, moverQualquerEtapa: false, editarCompras: false, editarAgenda: false, agendarMedicao: false, agendarManutencao: false, aprovarAutomacao: false, verIndicadores: true, acessarBiblioteca: true, verFinanceiro: true },
  operacional: { verTodasObras: true, criarObra: true, moverQualquerEtapa: true, editarCompras: true, editarAgenda: true, agendarMedicao: false, agendarManutencao: true, aprovarAutomacao: false, verIndicadores: true, acessarBiblioteca: true, verFinanceiro: false },
  comercial: { verTodasObras: true, criarObra: false, moverQualquerEtapa: false, editarCompras: false, editarAgenda: false, agendarMedicao: true, agendarManutencao: true, aprovarAutomacao: false, verIndicadores: false, acessarBiblioteca: false, verFinanceiro: false },
  medicao: { verTodasObras: false, criarObra: true, moverEtapasMedicao: true, editarCompras: false, editarAgenda: false, agendarMedicao: true, agendarManutencao: true, aprovarAutomacao: false, verIndicadores: false, acessarBiblioteca: false, verFinanceiro: false },
  projetos: { verTodasObras: false, criarObra: false, moverEtapasProjeto: true, editarCompras: false, editarAgenda: false, agendarMedicao: false, agendarManutencao: false, aprovarAutomacao: false, verIndicadores: false, acessarBiblioteca: false, verFinanceiro: false },
};

export function podeAvancarEtapa(role, etapaAtual) {
  if (role === 'admin' || role === 'operacional') return true;
  if (role === 'medicao') return ['medicao_inicial', 'medicao_final'].includes(etapaAtual);
  if (role === 'projetos') return ['projeto_contramarco', 'fabricacao_contramarco', 'projeto_final'].includes(etapaAtual);
  return false;
}
