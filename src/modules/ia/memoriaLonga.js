const CHAVE = 'maxibell.ia.memoriaLonga';

const PADRAO = [
  { id: 'regra-pos-obra', titulo: 'Pós-obra comercial', texto: 'Toda obra finalizada deve gerar follow-up comercial em 20 dias.' },
  { id: 'regra-prazo-cliente', titulo: 'Prazo prometido', texto: 'Prazo do cliente a 10 dias ou vencido entra como prioridade de gestão.' },
  { id: 'regra-oc', titulo: 'Ocorrências críticas', texto: 'Erro de projeto, medição, montagem ou falta de material deve criar card OC e notificar responsáveis.' },
];

export function listarMemoriaLonga() {
  const salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null');
  return salvo || PADRAO;
}

export function salvarMemoriaLonga(itens) {
  localStorage.setItem(CHAVE, JSON.stringify(itens));
  return itens;
}

export function adicionarMemoriaLonga(item) {
  const novo = { id: `${Date.now()}`, ...item };
  const itens = [novo, ...listarMemoriaLonga()];
  salvarMemoriaLonga(itens);
  return novo;
}
