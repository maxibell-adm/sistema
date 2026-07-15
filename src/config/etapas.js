export const ETAPAS = [
  { id: 'pedido_inicial', label: 'Pedido Inicial', cor: '#7F8C8D', responsavelPadrao: 'Andr\u00e9' },
  { id: 'medicao_inicial', label: 'Medi\u00e7\u00e3o Inicial', cor: '#2980B9', responsavelPadrao: 'Matheus' },
  { id: 'projeto_contramarco', label: 'Proj. Contramarco', cor: '#8E44AD', responsavelPadrao: 'Allana' },
  { id: 'fabricacao_contramarco', label: 'Fab. Contramarco', cor: '#E67E22', responsavelPadrao: 'Andr\u00e9' },
  { id: 'medicao_final', label: 'Medi\u00e7\u00e3o Final', cor: '#1E5799', responsavelPadrao: 'Matheus' },
  { id: 'projeto_final', label: 'Projeto Final', cor: '#6C3483', responsavelPadrao: 'Allana' },
  { id: 'compras', label: 'Compras', cor: '#D4AC0D', responsavelPadrao: 'Andr\u00e9' },
  { id: 'montagem', label: 'Montagem', cor: '#CA6F1E', responsavelPadrao: 'Andr\u00e9' },
  { id: 'entrega', label: 'Entrega', cor: '#16A085', responsavelPadrao: 'Andr\u00e9' },
  { id: 'instalacao', label: 'Instala\u00e7\u00e3o', cor: '#1A5276', responsavelPadrao: 'Andr\u00e9' },
  { id: 'instalacao_retorno', label: 'Retorno \u00e0 Instala\u00e7\u00e3o', cor: '#27AE60', responsavelPadrao: 'Andr\u00e9', grupo: 'pos_producao' },
  { id: 'entrega_cm', label: 'Entrega CM', cor: '#16A085', responsavelPadrao: 'Andr\u00e9' },
  { id: 'finalizado', label: 'Finalizado', cor: '#1E8449', responsavelPadrao: null },
  { id: 'manutencao', label: 'Manuten\u00e7\u00e3o', cor: '#C0392B', responsavelPadrao: 'Matheus' },
];

export const COR_ETAPA = Object.fromEntries(ETAPAS.map((etapa) => [etapa.id, etapa.cor]));

export const PRAZOS_DIAS = {
  medicao_inicial: 10,
  projeto_contramarco: 7,
  fabricacao_contramarco: 7,
  medicao_final: null,
  projeto_final: 15,
  compras_vidro: 7,
  compras_acessorios: 10,
  compras_perfil: 10,
  montagem: 30,
  entrega: 40,
  instalacao: 45,
};

export const GRUPOS_KANBAN = {
  todos: { label: 'Todas', etapas: ETAPAS.map((e) => e.id) },
  pre_producao: { label: 'Pr\u00e9-Produ\u00e7\u00e3o', etapas: ['pedido_inicial', 'medicao_inicial', 'projeto_contramarco', 'medicao_final', 'projeto_final'] },
  producao: { label: 'Produ\u00e7\u00e3o', etapas: ['fabricacao_contramarco', 'compras', 'montagem'] },
  pos_producao: { label: 'P\u00f3s-Produ\u00e7\u00e3o', etapas: ['entrega', 'instalacao', 'finalizado', 'manutencao'] },
  operacional: { label: 'Operacional', etapas: ['pedido_inicial', 'fabricacao_contramarco', 'compras', 'montagem', 'entrega', 'instalacao', 'finalizado', 'manutencao'] },
};

export const SEQUENCIA_ETAPAS = {
  'COM INSTALA\u00c7\u00c3O / COM CONTRAMARCO': ['pedido_inicial', 'medicao_inicial', 'projeto_contramarco', 'medicao_final', 'projeto_final', 'compras', 'montagem', 'instalacao', 'finalizado'],
  'COM INSTALA\u00c7\u00c3O / SEM CONTRAMARCO': ['pedido_inicial', 'medicao_final', 'projeto_final', 'compras', 'montagem', 'instalacao', 'finalizado'],
  'SEM INSTALA\u00c7\u00c3O / COM ENTREGA': ['pedido_inicial', 'medicao_final', 'projeto_final', 'compras', 'montagem', 'entrega', 'finalizado'],
};

export const ETAPA_INICIAL_OC = {
  falta_material: 'compras',
  erro_montagem: 'compras',
  erro_projeto: 'projeto_final',
  erro_medicao: 'medicao_final',
};

export const SEQUENCIA_OC = {
  falta_material: ['compras', 'montagem', 'instalacao_retorno'],
  erro_montagem: ['compras', 'montagem', 'instalacao_retorno'],
  erro_projeto: ['projeto_final', 'compras', 'montagem', 'instalacao_retorno'],
  erro_medicao: ['medicao_final', 'projeto_final', 'compras', 'montagem', 'instalacao_retorno'],
};

export function labelEtapa(id) {
  return ETAPAS.find((etapa) => etapa.id === id)?.label || id;
}

export function responsavelDaEtapa(id) {
  return ETAPAS.find((etapa) => etapa.id === id)?.responsavelPadrao || '\u00c1lvaro';
}

export function proximaEtapa(id) {
  const index = ETAPAS.findIndex((etapa) => etapa.id === id);
  if (index < 0 || index >= ETAPAS.length - 2) return null;
  return ETAPAS[index + 1];
}

export function proximaEtapaDepoisPedidoInicial(tipoServico) {
  if (tipoServico === 'COM INSTALA\u00c7\u00c3O / COM CONTRAMARCO') return 'medicao_inicial';
  if (tipoServico === 'COM INSTALA\u00c7\u00c3O / SEM CONTRAMARCO') return 'medicao_final';
  if (tipoServico === 'SEM INSTALA\u00c7\u00c3O / COM ENTREGA') return 'medicao_final';
  return 'medicao_inicial';
}

export function etapasValidasPorTipo(tipo) {
  return SEQUENCIA_ETAPAS[tipo] || ETAPAS.map((e) => e.id);
}

export function proximaEtapaValida(obra) {
  if (obra.ehCardOC) {
    const sequenciaOC = obra.sequenciaOC || SEQUENCIA_OC[obra.ocorrenciaTipo] || [];
    const indexOC = sequenciaOC.indexOf(obra.etapa);
    const idOC = indexOC >= 0 ? sequenciaOC[indexOC + 1] : null;
    return idOC ? ETAPAS.find((e) => e.id === idOC) : null;
  }
  if (obra.ehCardCM) {
    const sequenciaCM = obra.sequenciaEtapas || ['fabricacao_contramarco', 'entrega_cm', 'finalizado'];
    const indexCM = sequenciaCM.indexOf(obra.etapa);
    const idCM = indexCM >= 0 ? sequenciaCM[indexCM + 1] : null;
    return idCM ? ETAPAS.find((e) => e.id === idCM) : null;
  }
  const sequencia = obra.ehFase
    ? ['medicao_final', 'projeto_final', 'compras', 'montagem', obra.tipo !== 'SEM INSTALA\u00c7\u00c3O / COM ENTREGA' ? 'instalacao' : 'entrega', 'finalizado']
    : etapasValidasPorTipo(obra.tipo);
  const index = sequencia.indexOf(obra.etapa);
  const id = index >= 0 ? sequencia[index + 1] : null;
  return id ? ETAPAS.find((e) => e.id === id) : null;
}
