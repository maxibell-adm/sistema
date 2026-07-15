// Versão do sistema — atualizar manualmente a cada ciclo importante
export const VERSAO_SISTEMA = '2.6';
// BUILD_NUMBER e BUILD_DATE são injetados automaticamente pelo GitHub Actions
export const BUILD_NUMBER = typeof __BUILD_NUMBER__ !== 'undefined' ? __BUILD_NUMBER__ : 'dev';
export const BUILD_DATE = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : new Date().toLocaleDateString('pt-BR');

export const TIPOS_SERVICO = [
  'COM INSTALA\u00c7\u00c3O / COM CONTRAMARCO',
  'COM INSTALA\u00c7\u00c3O / SEM CONTRAMARCO',
  'SEM INSTALA\u00c7\u00c3O / COM ENTREGA',
];

export const ITENS_COMPRA = [
  { id: 'vidro', label: 'Vidro', prazo_dias: 7 },
  { id: 'acessorios_separacao', label: 'Acess\u00f3rios - Separa\u00e7\u00e3o', prazo_dias: 3 },
  { id: 'acessorios', label: 'Acess\u00f3rios - Compra / Entrega', prazo_dias: 10 },
  { id: 'perfil_separacao', label: 'Perfil - Separa\u00e7\u00e3o do Estoque', prazo_dias: 3 },
  { id: 'perfil', label: 'Perfil de Alum\u00ednio - Compra / Entrega', prazo_dias: 10 },
];

export const STATUS_SEPARACAO = [
  { id: 'pendente', label: 'Pendente' },
  { id: 'realizada', label: 'Realizada' },
];

export const STATUS_COMPRA = [
  { id: 'pendente', label: 'Pendente' },
  { id: 'aguardando_entrega', label: 'Aguardando Entrega' },
  { id: 'ok', label: 'OK' },
];

export const RESPONSAVEIS_EXECUCAO = [
  { id: 'alexandre_cruel', label: 'Alexandre Cruel' },
  { id: 'anderson', label: 'Anderson' },
  { id: 'jean', label: 'Jean' },
  { id: 'marcelo', label: 'Marcelo' },
  { id: 'euler', label: 'Euler' },
  { id: 'outro', label: 'Outro' },
];

export const RESPONSAVEIS_MEDICAO = [
  { id: 'matheus', label: 'Matheus' },
];

export const TIPOS_ATIVIDADE = [
  'Instala\u00e7\u00e3o',
  'Entrega',
  'Montagem',
  'Manuten\u00e7\u00e3o',
  'Fabrica\u00e7\u00e3o',
  'Assist\u00eancia T\u00e9cnica',
  'Vistoria',
  'Reinstala\u00e7\u00e3o',
  'Medi\u00e7\u00e3o Inicial',
  'Medi\u00e7\u00e3o Final',
];

export function etapaInicial(tipoServico) {
  if (tipoServico) return 'pedido_inicial';
  return 'pedido_inicial';
}

export function comprasPadrao() {
  return {
    vidro: { status: 'pendente', pedido: '', fornecedor: 'Total Temper', obs: '', dataPedido: null },
    acessorios_separacao: { status: 'pendente', pedido: '', fornecedor: '', obs: '', dataRealizacao: null },
    acessorios: { status: 'pendente', pedido: '', fornecedor: '', obs: '', dataPedido: null },
    perfil_separacao: { status: 'pendente', pedido: '', fornecedor: '', obs: '', dataRealizacao: null },
    perfil: { status: 'pendente', pedido: '', fornecedor: '', obs: '', dataPedido: null },
  };
}
