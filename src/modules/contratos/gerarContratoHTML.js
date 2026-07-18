import { valorPorExtenso, fmtR, fmtData, fmtDataCurta } from './utils.js';
import {
  DADOS_MAXIBELL,
  CLAUSULAS_COMUNS,
  CLAUSULAS_CONTRAMARCO,
  CLAUSULAS_ALVENARIA,
  CLAUSULAS_SEM_INSTALACAO,
} from './textosContrato.js';

function cssContrato() {
  return `<style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Open+Sans:wght@400;600;700&display=swap');
    :root{--azul:#1A3A5C;--azul-medio:#1E5799;--azul-claro:#2980B9;--preto:#0D0D0D;--cinza-escuro:#2C2C2C;--cinza-medio:#555;--cinza-claro:#F0F4F8;--branco:#fff;--linha:#C8D8E8;}
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
    body{font-family:'Open Sans',sans-serif;background:#E8EEF4;color:var(--cinza-escuro);font-size:8pt;line-height:1.55;}
    .page{width:210mm;margin:10mm auto;background:var(--branco);box-shadow:0 4px 24px rgba(0,0,0,.15);overflow:hidden;}
    .header{background:linear-gradient(135deg,var(--azul) 60%,var(--azul-medio));padding:10px 20px 8px;display:grid;grid-template-columns:1fr 1.8fr 1fr;align-items:center;border-bottom:4px solid var(--azul-claro);gap:8px;}
    .marca{font-family:'Montserrat',sans-serif;font-size:16pt;font-weight:700;letter-spacing:2px;color:white;}.slogan{font-size:5pt;color:#7FB3D3;letter-spacing:1.4px;text-transform:uppercase;margin-top:2px;}
    .header-titulo{text-align:center}.header-titulo h1{font-family:'Montserrat',sans-serif;font-size:7pt;font-weight:700;text-transform:uppercase;color:white;line-height:1.4}.badge{display:inline-block;margin-top:3px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:1px 8px;font-size:5.2pt;color:white;letter-spacing:.6px;}
    .header-info{text-align:right;font-size:6pt;color:rgba(255,255,255,.85);line-height:1.85}.header-info strong{color:white}.faixa-ref{background:var(--azul-claro);padding:3px 20px;display:flex;align-items:center;gap:10px;justify-content:center;flex-wrap:wrap}.faixa-ref span{font-family:'Montserrat',sans-serif;font-size:5.5pt;font-weight:700;color:white;letter-spacing:.6px;text-transform:uppercase}.faixa-ref .sep{opacity:.55}
    .identificacao{background:var(--cinza-claro);border-bottom:2px solid var(--linha);padding:6px 20px;display:flex;gap:7px}.parte{flex:1;border:1px solid var(--linha);border-radius:4px;padding:5px 8px;background:white}.parte-label{font-family:'Montserrat',sans-serif;font-size:5.3pt;font-weight:700;text-transform:uppercase;color:var(--azul-medio);letter-spacing:.7px;margin-bottom:3px;border-bottom:1px solid var(--linha);padding-bottom:2px}.campo-linha{display:flex;gap:3px;margin:1px 0;flex-wrap:wrap}.campo-label{font-size:5.5pt;font-weight:700;color:var(--cinza-medio);white-space:nowrap}.dado{font-weight:700;color:var(--preto);font-size:5.8pt}
    .preambulo{padding:6px 20px 5px;border-bottom:1px solid var(--linha)}.preambulo p{font-size:7.5pt;text-align:justify;line-height:1.6}.duas-colunas{display:grid;grid-template-columns:1fr 1.5px 1fr}.coluna{padding:8px 13px}.divisor-central{background:var(--azul-claro)}.cl{font-family:'Montserrat',sans-serif;font-size:5.8pt;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:white;background:var(--azul);padding:2px 7px;border-radius:3px;display:block;margin-bottom:3px;white-space:pre-line}p.it{font-size:7.5pt;text-align:justify;line-height:1.58;margin:0 0 4px}.sec{margin-bottom:7px;white-space:pre-line}.nota{background:#EBF3FB;border-left:3px solid var(--azul-claro);border-radius:0 3px 3px 0;padding:4px 7px;font-size:7pt;color:var(--cinza-medio);margin-top:6px;line-height:1.55}.alerta{background:#FFF8E1;border-left:3px solid #F39C12;border-radius:0 3px 3px 0;padding:4px 7px;font-size:7pt;color:#5D4037;margin-top:4px;line-height:1.55}
    .local-data{padding:5px 20px;font-size:7pt;color:var(--cinza-medio);text-align:center;border-top:2px solid var(--linha);border-bottom:1px solid var(--linha);font-family:'Montserrat',sans-serif;letter-spacing:.4px}.assinaturas{background:var(--cinza-claro);padding:10px 20px 9px}.assinaturas h3{font-family:'Montserrat',sans-serif;font-size:6pt;font-weight:700;color:var(--azul);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}.assin-grid,.test-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:10px}.assin-linha{border-bottom:1.5px solid var(--azul);height:26px;width:100%}.assin-label{font-size:6pt;color:var(--cinza-medio);text-align:center}.assin-label strong{color:var(--azul)}.assin-sub{font-size:5.5pt;color:var(--azul-medio);text-align:center;font-weight:700;font-family:'Montserrat',sans-serif;text-transform:uppercase;letter-spacing:.4px}footer{background:var(--azul);color:rgba(255,255,255,.7);font-size:5.2pt;text-align:center;padding:4px 20px;letter-spacing:.3px}.nm{font-weight:700;text-transform:uppercase}@media print{body{background:white}.page{margin:0;box-shadow:none;width:100%}}
  </style>`;
}

function montarPgto(estado, total) {
  if (estado.pgto === 'avista') {
    return { pgto21: `<strong>2.1</strong> O preço total é de <strong>${fmtR(total)} (${valorPorExtenso(total)})</strong>, a ser pago à vista.`, pgto24: '' };
  }
  const entradaVal = total * (Number(estado.entrada) / 100);
  const restVal = total - entradaVal;
  const parc = restVal / Number(estado.parcelas || 1);
  return {
    pgto21: `<strong>2.1</strong> O preço total é de <strong>${fmtR(total)} (${valorPorExtenso(total)})</strong>.`,
    pgto24: `<strong>2.4</strong> Entrada de ${estado.entrada}% (${fmtR(entradaVal)}) no ato. Saldo de ${fmtR(restVal)} em ${estado.parcelas}x de ${fmtR(parc)}.`,
  };
}

function cabecalhoPartes(tipo, nome, cpf, endereco, proposta, cidade, data, faixaHTML) {
  const isSem = tipo === 'seminstalacao';
  const titulo = isSem ? 'Contrato de Compra, Venda,<br>Fabricação e Entrega de<br>Esquadrias de Alumínio' : 'Contrato de Compra, Venda,<br>Fabricação e Instalação de<br>Esquadrias de Alumínio';
  return `<div class="header"><div><div class="marca">MAXIBELL</div><div class="slogan">O máximo da beleza em esquadrias</div></div><div class="header-titulo"><h1>${titulo}</h1><span class="badge">Instrumento Particular entre as Partes</span></div><div class="header-info">Varginha - MG<br><strong>CNPJ:</strong> ${DADOS_MAXIBELL.cnpj}<br><strong>Proposta:</strong> ${proposta}<br><strong>Data:</strong> ${fmtDataCurta(data)}</div></div><div class="faixa-ref">${faixaHTML}</div><div class="identificacao"><div class="parte"><div class="parte-label">${isSem ? '① Vendedora' : '① Contratada'}</div><div class="campo-linha"><span class="campo-label">Razão Social:</span><span class="dado">${DADOS_MAXIBELL.razaoSocial}</span></div><div class="campo-linha"><span class="campo-label">CNPJ:</span><span class="dado">${DADOS_MAXIBELL.cnpj}</span></div><div class="campo-linha"><span class="campo-label">Endereço:</span><span class="dado">${DADOS_MAXIBELL.endereco}</span></div><div class="campo-linha"><span class="campo-label">Representante:</span><span class="dado">${DADOS_MAXIBELL.representante}</span></div></div><div class="parte"><div class="parte-label">${isSem ? '② Compradora' : '② Contratante'}</div><div class="campo-linha"><span class="campo-label">Nome:</span><span class="dado">${nome}</span></div><div class="campo-linha"><span class="campo-label">CPF:</span><span class="dado">${cpf}</span></div><div class="campo-linha"><span class="campo-label">Endereço:</span><span class="dado">${endereco}</span></div></div></div>`;
}

function rodapeAssinaturas(tipo, nome, cpf, proposta, cidade, data) {
  const isSem = tipo === 'seminstalacao';
  return `<div class="local-data">${cidade}, ${fmtData(data)}.</div><div class="assinaturas"><h3>Assinaturas</h3><div class="assin-grid"><div><div class="assin-linha"></div><div class="assin-label"><strong>${DADOS_MAXIBELL.razaoSocial}</strong></div><div class="assin-label">CNPJ: ${DADOS_MAXIBELL.cnpj}</div><div class="assin-sub">${isSem ? 'Vendedora' : 'Contratada'}</div></div><div><div class="assin-linha"></div><div class="assin-label"><strong>${nome}</strong></div><div class="assin-label">CPF: ${cpf}</div><div class="assin-sub">${isSem ? 'Compradora' : 'Contratante'}</div></div></div><div class="test-grid"><div><div class="assin-linha"></div><div class="assin-label">Nome: __________________________ CPF: ________________</div><div class="assin-sub">Testemunha 1</div></div><div><div class="assin-linha"></div><div class="assin-label">Nome: __________________________ CPF: ________________</div><div class="assin-sub">Testemunha 2</div></div></div></div><footer>${DADOS_MAXIBELL.razaoSocial} - Contrato ${proposta} | ${cidade}</footer>`;
}

export function gerarHTML(tipo, estado, campos) {
  const { nome, cpf, data, rua, numero, bairro, cidadeEnd, uf, cep, cidade, valor, propostaNum } = campos;
  const proposta = 'PP-' + propostaNum;
  const endereco = `${rua}, nº ${numero} — ${bairro} — ${cidadeEnd}/${uf} — CEP ${cep}`;
  const total = parseFloat(String(valor).replace(/\./g, '').replace(',', '.')) || 0;
  const { pgto21, pgto24 } = montarPgto(estado, total);
  const clausulas = tipo === 'contramarco' ? CLAUSULAS_CONTRAMARCO : tipo === 'alvenaria' ? CLAUSULAS_ALVENARIA : CLAUSULAS_SEM_INSTALACAO;
  const nomeUpper = nome.trim().toUpperCase();
  const faixaHTML = `<span>${proposta}</span><span class="sep">|</span><span>${cidade}</span><span class="sep">|</span><span>${fmtR(total)}</span>`;
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Contrato ${proposta}</title>${cssContrato()}</head><body><div class="page">${cabecalhoPartes(tipo, nomeUpper, cpf, endereco, proposta, cidade, data, faixaHTML)}<div class="preambulo"><p>As partes acima identificadas têm entre si justo e contratado o presente instrumento particular.</p></div><div class="duas-colunas"><div class="coluna"><div class="sec"><span class="cl">${clausulas.objeto(proposta, cidade)}</span></div><div class="sec"><span class="cl">2. Do Preço e Condições de Pagamento</span><p class="it">${pgto21}</p><p class="it"><strong>2.2</strong> O pagamento será feito em conta indicada pela CONTRATADA.</p><p class="it"><strong>2.3</strong> O atraso implicará multa, juros e correção monetária.</p>${pgto24 ? `<p class="it">${pgto24}</p>` : ''}<p class="it">${clausulas.responsabilidades}</p></div></div><div class="divisor-central"></div><div class="coluna"><div class="sec"><span class="cl">${CLAUSULAS_COMUNS.garantia}</span></div><div class="sec"><span class="cl">${CLAUSULAS_COMUNS.rescisao}</span></div><div class="sec">${CLAUSULAS_COMUNS.clausula5(cidade)}</div><div class="nota">${clausulas.nota(proposta)}</div>${clausulas.alerta ? `<div class="alerta">${clausulas.alerta}</div>` : ''}</div></div>${rodapeAssinaturas(tipo, nomeUpper, cpf, proposta, cidade, data)}</div></body></html>`;
}
