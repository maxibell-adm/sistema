const CHAVE = 'maxibell.biblioteca.ia';

const ITENS_PADRAO = [
  {
    id: 'script-prazo-cliente',
    titulo: 'Script: prazo prometido ao cliente',
    categoria: 'comercial',
    texto: 'Confirmar expectativa, informar etapa atual e alinhar proximo retorno com data objetiva.',
  },
  {
    id: 'checklist-vhsys',
    titulo: 'Checklist VHSYS',
    categoria: 'operacional',
    texto: 'Antes de sair do pedido inicial, conferir numero do pedido de esquadrias e contramarco quando houver.',
  },
  {
    id: 'ocorrencia-instalacao',
    titulo: 'Padrao para ocorrencia de instalacao',
    categoria: 'instalacao',
    texto: 'Registrar tipo, descricao, responsavel, foto/arquivo quando existir e card OC derivado.',
  },
];

function carregar() {
  const salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null');
  if (salvo) return salvo;
  localStorage.setItem(CHAVE, JSON.stringify(ITENS_PADRAO));
  return ITENS_PADRAO;
}

export function listarItensBiblioteca() {
  return carregar();
}

export function buscarItemBiblioteca(termo = '') {
  const busca = termo.toLowerCase();
  return carregar().filter((item) => `${item.titulo} ${item.categoria} ${item.texto}`.toLowerCase().includes(busca));
}

export function salvarItemBiblioteca(item) {
  const itens = carregar();
  const novo = { id: item.id || `${Date.now()}`, ...item };
  const atualizados = item.id ? itens.map((atual) => (atual.id === item.id ? novo : atual)) : [novo, ...itens];
  localStorage.setItem(CHAVE, JSON.stringify(atualizados));
  return novo;
}
