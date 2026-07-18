import { valorPorExtenso, fmtR, fmtData } from './utils.js';
import { TEXTOS_TEMPER, DADOS_MAXIBELL } from './textosContrato.js';

export function gerarTemperHTML(campos) {
  const { nome, cpf, endereco, valorNF, dataTemper, nacionalidade } = campos;
  const total = parseFloat(String(valorNF).replace(/\./g, '').replace(',', '.')) || 0;
  const extenso = valorPorExtenso(total);
  const dataFmt = fmtData(dataTemper);
  const corpo = TEXTOS_TEMPER.corpo(nome, cpf, endereco, fmtR(total), extenso, dataFmt, nacionalidade);

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Autorização Total Temper</title><style>
    @page{size:A4;margin:1.5cm}body{font-family:Calibri,Arial,sans-serif;font-size:12pt;margin:0;padding:18px;line-height:1.45;color:#000}.cabecalho{text-align:left;margin-bottom:25px;padding-bottom:10px;border-bottom:2px solid #000}.cabecalho p{margin:2px 0;font-size:11pt}h1{text-align:center;font-size:12pt;font-weight:bold;margin:22px 0;text-transform:uppercase}p{text-align:justify;margin-bottom:15px}.data{margin-top:30px;margin-bottom:42px}.assinatura-container{display:flex;justify-content:space-between;margin-top:50px;gap:60px}.assinatura-bloco{flex:1;text-align:center}.linha-assinatura{border-bottom:1px solid #000;margin-bottom:5px;height:30px}.label-assinatura{font-weight:bold;margin-top:5px;margin-bottom:5px}@media print{body{padding:0}}
  </style></head><body><div class="cabecalho"><p>TOTAL TEMPER INDÚSTRIA E COMÉRCIO LTDA</p><p>Av. Ayrton Senna da Silva, 735 - Rezende</p><p>Varginha-MG</p><p>(35)3219-3100</p></div><h1>${TEXTOS_TEMPER.introducao}</h1><p>${corpo}</p><p>${TEXTOS_TEMPER.observacao}</p><p>Autorizo ainda ${DADOS_MAXIBELL.razaoSocial}, CNPJ ${DADOS_MAXIBELL.cnpj}, a receber os vidros e assinar documentos de entrega relacionados a esta compra.</p><p class="data">Varginha, ${dataFmt}.</p><div class="assinatura-container"><div class="assinatura-bloco"><div class="linha-assinatura"></div><div class="label-assinatura">AUTORIZANTE</div><div>CPF nº: ${cpf}</div></div><div class="assinatura-bloco"><div class="linha-assinatura"></div><div class="label-assinatura">FORNECEDORA</div><div>CNPJ nº: 20.703.328/0001-81</div></div></div></body></html>`;
}
