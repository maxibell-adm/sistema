import { useMemo, useRef, useState } from 'react';
import { useObras } from '@/modules/obras/useObras.js';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { gerarHTML } from '@/modules/contratos/gerarContratoHTML.js';
import { gerarTemperHTML } from '@/modules/contratos/gerarAutorizacaoHTML.js';
import { salvarPreCadastro } from '@/modules/contratos/contratosService.js';
import { documentosParaTipo } from '@/modules/contratos/documentosTecnicos.js';
import { mascaraCPF, mascaraCEP, valorPorExtenso, hojeISO } from '@/modules/contratos/utils.js';
import '@/styles/contratos.css';

const camposIniciais = {
  nome: '', cpf: '', data: hojeISO(),
  rua: '', numero: '', bairro: '', cidadeEnd: 'Varginha', uf: 'MG', cep: '',
  propostaNum: '', cidade: 'Varginha/MG', valor: '',
  gerarTemper: false, valorNF: '', nacionalidade: 'brasileiro(a)',
};

const estadoInicial = { tipo: '', pgto: '', entrada: '', parcelas: '', temPortaCorrer: false };

export default function GeradorContratos() {
  const { obrasVisiveis } = useObras();
  const { usuario } = useAuth();
  const [campos, setCampos] = useState(camposIniciais);
  const [estado, setEstado] = useState(estadoInicial);
  const [htmlContrato, setHtmlContrato] = useState('');
  const [htmlTemper, setHtmlTemper] = useState('');
  const [docsGerados, setDocsGerados] = useState([]);
  const [aviso, setAviso] = useState(null);
  const [erros, setErros] = useState({});
  const iframeRef = useRef(null);
  const iframeTemperRef = useRef(null);

  const set = (k, v) => setCampos((f) => ({ ...f, [k]: v }));
  const setE = (k, v) => setEstado((f) => ({ ...f, [k]: v }));

  const extenso = useMemo(() => {
    const n = parseFloat(campos.valor.replace(/\./g, '').replace(',', '.'));
    return n > 0 ? valorPorExtenso(n) : '';
  }, [campos.valor]);

  const resumoPgto = useMemo(() => {
    if (!estado.pgto || !campos.valor) return null;
    const total = parseFloat(campos.valor.replace(/\./g, '').replace(',', '.'));
    if (Number.isNaN(total)) return null;
    if (estado.pgto === 'avista') return `À vista: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (estado.pgto === 'entrada' && estado.entrada && estado.parcelas) {
      const ent = total * (estado.entrada / 100);
      const rest = total - ent;
      const parc = rest / estado.parcelas;
      return `Entrada: R$ ${ent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} + ${estado.parcelas}x de R$ ${parc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    return null;
  }, [estado, campos.valor]);

  function validar() {
    const obrig = ['nome', 'cpf', 'data', 'rua', 'numero', 'bairro', 'cidadeEnd', 'uf', 'cep', 'propostaNum', 'cidade', 'valor'];
    const novosErros = {};
    obrig.forEach((k) => { if (!campos[k]?.trim()) novosErros[k] = true; });
    if (!estado.tipo) novosErros.tipo = true;
    if (!estado.pgto) novosErros.pgto = true;
    if (estado.pgto === 'entrada' && (!estado.entrada || !estado.parcelas)) {
      novosErros.entrada = true;
      novosErros.parcelas = true;
    }
    if (campos.gerarTemper && !campos.valorNF?.trim()) novosErros.valorNF = true;
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  function gerarContrato() {
    if (!validar()) {
      setAviso({ tipo: 'erro', texto: 'Preencha todos os campos obrigatórios.' });
      return;
    }

    const html = gerarHTML(estado.tipo, estado, campos);
    setHtmlContrato(html);
    if (iframeRef.current) iframeRef.current.srcdoc = html;

    if (campos.gerarTemper && campos.valorNF) {
      const endereco = `${campos.rua}, nº ${campos.numero} — ${campos.bairro} — ${campos.cidadeEnd}/${campos.uf}`;
      const htmlT = gerarTemperHTML({
        nome: campos.nome.trim().toUpperCase(),
        cpf: campos.cpf,
        endereco,
        nacionalidade: campos.nacionalidade,
        valorNF: campos.valorNF,
        dataTemper: campos.data,
      });
      setHtmlTemper(htmlT);
      if (iframeTemperRef.current) iframeTemperRef.current.srcdoc = htmlT;
    } else {
      setHtmlTemper('');
      if (iframeTemperRef.current) iframeTemperRef.current.srcdoc = '';
    }

    const docs = documentosParaTipo(estado.tipo, estado.temPortaCorrer);
    setDocsGerados(docs);

    const pp = 'PP-' + campos.propostaNum.trim();
    const resultado = salvarPreCadastro({
      pp,
      cliente: campos.nome.trim().toUpperCase(),
      cpf: campos.cpf,
      cidade: campos.cidade,
      endereco: `${campos.rua}, nº ${campos.numero} — ${campos.bairro} — ${campos.cidadeEnd}/${campos.uf} — CEP ${campos.cep}`,
      valor: parseFloat(campos.valor.replace(/\./g, '').replace(',', '.')),
      tipo: estado.tipo,
      pagamento: { modo: estado.pgto, entrada: estado.entrada, parcelas: estado.parcelas },
      temPortaCorrer: estado.temPortaCorrer,
      gerarTemper: campos.gerarTemper,
      responsavel: usuario?.nome || '',
    }, obrasVisiveis);

    if (resultado.salvo) setAviso({ tipo: 'ok', texto: `Pré-cadastro salvo para ${pp}. Documentos prontos para download.` });
    else if (resultado.motivo === 'obra_existente') setAviso({ tipo: 'alerta', texto: `A ${pp} já está na Central de Obras. O contrato não alterará os dados da obra.` });
  }

  function abrirDocumento(htmlStr) {
    const win = window.open('', '_blank');
    win.document.write(htmlStr);
    win.document.close();
  }

  function abrirPDF(caminho) {
    window.open(caminho, '_blank');
  }

  function limpar() {
    setCampos(camposIniciais);
    setEstado(estadoInicial);
    setHtmlContrato('');
    setHtmlTemper('');
    setDocsGerados([]);
    setAviso(null);
    setErros({});
    if (iframeRef.current) iframeRef.current.srcdoc = '';
    if (iframeTemperRef.current) iframeTemperRef.current.srcdoc = '';
  }

  const cls = (k) => `form-field${erros[k] ? ' campo-erro' : ''}`;

  return (
    <div className="gc-page">
      <div className="gc-layout">
        <div className="gc-form card card-pad">
          {aviso && <div className={`gc-aviso gc-aviso-${aviso.tipo}`}>{aviso.texto}</div>}

          <div className="section-hdr"><div className="section-titulo">Dados do Contratante</div></div>
          <div className="form-grid">
            <div className={`${cls('nome')} full`}><label>Nome completo *</label><input value={campos.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Nome completo" /></div>
            <div className={cls('cpf')}><label>CPF *</label><input value={campos.cpf} onChange={(e) => set('cpf', mascaraCPF(e.target.value))} maxLength={14} placeholder="000.000.000-00" /></div>
            <div className={cls('data')}><label>Data do contrato *</label><input type="date" value={campos.data} onChange={(e) => set('data', e.target.value)} /></div>
            <div className={cls('rua')}><label>Rua *</label><input value={campos.rua} onChange={(e) => set('rua', e.target.value)} /></div>
            <div className={cls('numero')}><label>Número *</label><input value={campos.numero} onChange={(e) => set('numero', e.target.value)} /></div>
            <div className={cls('bairro')}><label>Bairro *</label><input value={campos.bairro} onChange={(e) => set('bairro', e.target.value)} /></div>
            <div className={cls('cidadeEnd')}><label>Cidade *</label><input value={campos.cidadeEnd} onChange={(e) => set('cidadeEnd', e.target.value)} /></div>
            <div className={cls('uf')}><label>UF *</label><input value={campos.uf} onChange={(e) => set('uf', e.target.value.toUpperCase())} maxLength={2} /></div>
            <div className={cls('cep')}><label>CEP *</label><input value={campos.cep} onChange={(e) => set('cep', mascaraCEP(e.target.value))} maxLength={9} placeholder="00000-000" /></div>
          </div>

          <div className="section-hdr mt-16"><div className="section-titulo">Dados da Proposta</div></div>
          <div className="form-grid">
            <div className={cls('propostaNum')}><label>Número PP *</label><div className="gc-pp-wrap"><span className="gc-pp-prefix">PP-</span><input value={campos.propostaNum} onChange={(e) => set('propostaNum', e.target.value.replace(/\D/g, ''))} placeholder="9125" /></div></div>
            <div className={cls('cidade')}><label>Cidade da instalação *</label><input value={campos.cidade} onChange={(e) => set('cidade', e.target.value)} placeholder="Varginha/MG" /></div>
          </div>

          <div className="section-hdr mt-16"><div className="section-titulo">Tipo de Instalação *</div></div>
          <div className="gc-toggles">
            {[{ v: 'contramarco', l: '🟦 Com Contramarco' }, { v: 'alvenaria', l: '🟩 Direto na Alvenaria' }, { v: 'seminstalacao', l: '📦 Sem Instalação' }].map(({ v, l }) => (
              <button key={v} type="button" className={`gc-toggle ${estado.tipo === v ? 'ativo' : ''} ${erros.tipo ? 'erro' : ''}`} onClick={() => setE('tipo', v)}>{l}</button>
            ))}
          </div>
          <label className="gc-check"><input type="checkbox" checked={estado.temPortaCorrer} onChange={(e) => setE('temPortaCorrer', e.target.checked)} />🚪 Esta obra inclui porta de correr</label>

          <div className="section-hdr mt-16"><div className="section-titulo">Condições Comerciais</div></div>
          <div className="form-grid"><div className={cls('valor')}><label>Valor total (R$) *</label><input value={campos.valor} onChange={(e) => set('valor', e.target.value)} placeholder="Ex: 12.500,00" />{extenso && <small className="gc-extenso">{extenso}</small>}</div></div>
          <div className="gc-toggles mt-12">
            {[{ v: 'avista', l: '💰 À Vista' }, { v: 'entrada', l: '📊 Com Entrada' }].map(({ v, l }) => (
              <button key={v} type="button" className={`gc-toggle ${estado.pgto === v ? 'ativo' : ''} ${erros.pgto ? 'erro' : ''}`} onClick={() => setE('pgto', v)}>{l}</button>
            ))}
          </div>
          {estado.pgto === 'entrada' && <><div className="gc-sub-label mt-10">% de entrada</div><div className="gc-toggles">{[30, 40, 50, 60].map((p) => <button key={p} type="button" className={`gc-toggle gc-toggle-sm ${estado.entrada === p ? 'ativo' : ''}`} onClick={() => setE('entrada', p)}>{p}%</button>)}</div><div className="gc-sub-label mt-10">Número de parcelas</div><div className="gc-toggles">{[1, 2, 3, 4, 5, 6].map((n) => <button key={n} type="button" className={`gc-toggle gc-toggle-sm ${estado.parcelas === n ? 'ativo' : ''}`} onClick={() => setE('parcelas', n)}>{n}x</button>)}</div></>}
          {resumoPgto && <div className="gc-resumo-pgto">{resumoPgto}</div>}

          <div className="section-hdr mt-16"><div className="section-titulo">Autorização Total Temper</div></div>
          <label className="gc-check"><input type="checkbox" checked={campos.gerarTemper} onChange={(e) => set('gerarTemper', e.target.checked)} />🔐 Gerar Autorização Total Temper junto com o contrato</label>
          {campos.gerarTemper && <div className={cls('valorNF')}><label>Valor da nota fiscal (R$) *</label><input value={campos.valorNF} onChange={(e) => set('valorNF', e.target.value)} placeholder="Ex: 8.500,00" /><small className="text-muted fs-11">Nome, CPF e endereço são reaproveitados automaticamente.</small></div>}

          <div className="gc-acoes mt-20"><button type="button" className="btn btn-primary" onClick={gerarContrato}>Gerar Contrato</button><button type="button" className="btn btn-secondary" onClick={limpar}>Limpar</button></div>

          {(htmlContrato || docsGerados.length > 0) && <div className="gc-docs"><div className="section-titulo">📄 Documentos gerados</div>{htmlContrato && <div className="gc-doc-item"><div className="gc-doc-info"><span className="gc-doc-icon">📝</span><div><div className="gc-doc-nome">Contrato PP-{campos.propostaNum}</div><div className="gc-doc-desc">Contrato gerado para assinatura</div></div></div><button className="btn btn-sm btn-primary" onClick={() => abrirDocumento(htmlContrato)}>🖨 Abrir / Imprimir</button></div>}{htmlTemper && <div className="gc-doc-item"><div className="gc-doc-info"><span className="gc-doc-icon">🔐</span><div><div className="gc-doc-nome">Autorização Total Temper</div><div className="gc-doc-desc">Autorização para aquisição de vidros</div></div></div><button className="btn btn-sm btn-secondary" onClick={() => abrirDocumento(htmlTemper)}>🖨 Abrir / Imprimir</button></div>}{docsGerados.map((doc) => <div key={doc.caminho} className="gc-doc-item"><div className="gc-doc-info"><span className="gc-doc-icon">{doc.icone}</span><div><div className="gc-doc-nome">{doc.nome}</div><div className="gc-doc-desc">{doc.descricao}</div></div></div><button className="btn btn-sm btn-secondary" onClick={() => abrirPDF(doc.caminho)}>📥 Abrir PDF</button></div>)}</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="gc-preview-wrap">
            <div className="gc-preview-titulo">
              {htmlContrato
                ? `Contrato PP-${campos.propostaNum} — ${
                    estado.tipo === 'contramarco' ? '🟦 Contramarco' :
                    estado.tipo === 'alvenaria' ? '🟩 Alvenaria' : '📦 Sem Instalação'
                  }`
                : 'Preview do contrato'}
            </div>
            {!htmlContrato && (
              <div className="gc-preview-vazio">
                Preencha o formulário e clique em <b>Gerar Contrato</b>
              </div>
            )}
            <iframe ref={iframeRef} className={`gc-iframe ${htmlContrato ? 'visivel' : ''}`} title="Preview Contrato" />
          </div>

          {htmlTemper && (
            <div className="gc-preview-wrap">
              <div className="gc-preview-titulo">🔐 Autorização Total Temper</div>
              <iframe
                ref={iframeTemperRef}
                className="gc-iframe visivel"
                title="Preview Autorização Temper"
                style={{ height: 500 }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
