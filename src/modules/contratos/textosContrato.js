export const DADOS_MAXIBELL = {
  razaoSocial: 'MAXIBELL PORTAS E JANELAS LTDA',
  cnpj: '26.204.294/0001-67',
  endereco: 'Rua São João, nº 570 — Jardim Esplanada — Monsenhor Paulo/MG — CEP 37045-000',
  representante: 'ÁLVARO HENRIQUE BUENO MOREIRA',
};

export const CLAUSULAS_COMUNS = {
  garantia: `3. Das Garantias e Responsabilidades
3.1 A CONTRATADA garante as esquadrias fornecidas contra defeitos de fabricação pelo prazo de 12 meses, conforme uso normal e conservação adequada.
3.2 A garantia não abrange mau uso, instalação inadequada por terceiros, modificações não autorizadas, sinistros, casos fortuitos ou força maior.
3.3 A CONTRATANTE é responsável por garantir vãos em condições adequadas para recebimento das esquadrias.`,
  rescisao: `4. Da Rescisão
4.1 O contrato poderá ser rescindido mediante notificação prévia por escrito.
4.2 Havendo rescisão após início da fabricação, serão devidos os valores proporcionais aos serviços executados e multa de 20% sobre o contrato.
4.3 O inadimplemento gera multa de 2%, juros de 1% ao mês e correção monetária.`,
  clausula5: (cidade) => `5. Do Foro
5.1 Fica eleito o foro da Comarca de ${cidade.split('/')[0]}/MG, com renúncia a qualquer outro.

As partes assinam este instrumento em 2 vias de igual teor e forma.`,
};

export const CLAUSULAS_CONTRAMARCO = {
  objeto: (proposta) => `1. Do Objeto e da Prestação dos Serviços
1.1 Fornecimento, fabricação sob medida e instalação de esquadrias de alumínio com contramarco, conforme Proposta Comercial ${proposta}.
1.2 Inclui fornecimento dos perfis, acessórios, fabricação, instalação de contramarcos e instalação das esquadrias.
1.3 A instalação das esquadrias será realizada após chumbamento e cura dos contramarcos.
1.4 A Proposta Comercial rubricada pelas partes integra este Contrato.`,
  responsabilidades: `2.5 É responsabilidade da CONTRATANTE garantir vãos adequados, acesso livre ao local e preservação da numeração dos vãos.
2.6 A CONTRATADA poderá suspender instalação caso os vãos não estejam nas condições técnicas exigidas.`,
  nota: (proposta) => `📌 Proposta ${proposta} é parte integrante. Instalação com contramarco conforme manual técnico fornecido.`,
};

export const CLAUSULAS_ALVENARIA = {
  objeto: (proposta) => `1. Do Objeto e da Prestação dos Serviços
1.1 Fornecimento, fabricação sob medida e instalação de esquadrias diretamente no vão rebocado, sem contramarco, conforme Proposta Comercial ${proposta}.
1.2 Inclui fornecimento dos perfis, acessórios, fabricação e instalação das esquadrias.
1.3 A Proposta Comercial rubricada pelas partes integra este Contrato.`,
  responsabilidades: `2.5 A esquadria será fabricada com base na menor medida encontrada no vão, podendo resultar em pequenas folgas naturais.
2.6 Correções na alvenaria, peitoril, reboco ou acabamento são responsabilidade da CONTRATANTE.
2.7 A CONTRATANTE deve preservar a numeração dos vãos até a instalação.`,
  nota: (proposta) => `📌 Proposta ${proposta} é parte integrante. Instalação direta no vão rebocado, sem contramarcos.`,
  alerta: '⚠️ O CONTRATANTE é responsável pela entrega dos vãos rebocados, nivelados e prontos para instalação.',
};

export const CLAUSULAS_SEM_INSTALACAO = {
  objeto: (proposta) => `1. Do Objeto e da Prestação dos Serviços
1.1 Fabricação sob medida e entrega de esquadrias de alumínio conforme Proposta Comercial ${proposta}.
1.2 Este contrato não inclui serviços de instalação.
1.3 A instalação é de exclusiva responsabilidade da COMPRADORA.`,
  responsabilidades: `2.5 A COMPRADORA é integralmente responsável pela instalação das esquadrias e condições dos vãos.
2.6 A CONTRATADA não se responsabiliza por danos decorrentes de instalação por terceiros.`,
  nota: (proposta) => `📌 Proposta ${proposta} é parte integrante. Contrato de fornecimento e entrega sem instalação.`,
};

export const TEXTOS_TEMPER = {
  introducao: 'AUTORIZAÇÃO PARA AQUISIÇÃO DE VIDROS',
  corpo: (nomeTemper, cpfTemper, endTemper, valorNF, valorExtenso, dataFmt, nacionalidade) =>
    `Eu, ${nomeTemper}, ${nacionalidade}, portador(a) do CPF nº ${cpfTemper}, residente e domiciliado(a) na ${endTemper}, autorizo a MAXIBELL PORTAS E JANELAS LTDA a adquirir, em meu nome, vidros junto à empresa TOTAL TEMPER, no valor de ${valorNF} (${valorExtenso}), conforme Nota Fiscal a ser emitida. Esta autorização é válida exclusivamente para a finalidade acima descrita, sendo emitida em ${dataFmt}.`,
  observacao: 'Esta autorização é parte integrante do contrato de fornecimento e instalação de esquadrias firmado entre as partes.',
};
