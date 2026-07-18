export const DOCS_TECNICOS = {
  manual_contramarco: {
    caminho: '/docs/manual-contramarco.pdf',
    nome: 'Manual de Instalação de Contramarcos',
    descricao: 'Instruções técnicas para instalação dos contramarcos pelo responsável pela obra civil.',
    icone: '📐',
  },
  guia_alvenaria: {
    caminho: '/docs/guia-alvenaria.pdf',
    nome: 'Guia de Instalação na Alvenaria',
    descricao: 'Orientações para instalação de esquadrias diretamente no vão rebocado sem contramarco.',
    icone: '🧱',
  },
  manual_porta_correr: {
    caminho: '/docs/manual-porta-correr.pdf',
    nome: 'Manual Técnico de Preparação de Vão — Portas de Correr',
    descricao: 'Instruções sobre nivelamento de piso e posicionamento de soleira para portas de correr.',
    icone: '🚪',
  },
};

export function documentosParaTipo(tipo, temPortaCorrer) {
  const docs = [];
  if (tipo === 'contramarco') docs.push(DOCS_TECNICOS.manual_contramarco);
  if (tipo === 'alvenaria') docs.push(DOCS_TECNICOS.guia_alvenaria);
  if (temPortaCorrer) docs.push(DOCS_TECNICOS.manual_porta_correr);
  return docs;
}
