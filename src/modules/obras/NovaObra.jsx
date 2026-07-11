import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TIPOS_SERVICO } from '@/config/constantes.js';
import { useApp } from '@/modules/layout/AppContext.jsx';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import BotaoVoltar from '@/modules/ui/BotaoVoltar.jsx';
import Button from '@/modules/ui/Button.jsx';

const inicial = { pp: '', cliente: '', cidade: '', tipo: TIPOS_SERVICO[0], fechamento: '', valor: '', pagamento: '', prazo: '', prazoCliente: '', obs: '', cpf: '', endereco: '' };

function mapearTipo(tipoContrato) {
  if (tipoContrato === 'Com Contramarco') return 'COM INSTALAÇÃO / COM CONTRAMARCO';
  if (tipoContrato === 'Direto na Alvenaria') return 'COM INSTALAÇÃO / SEM CONTRAMARCO';
  if (tipoContrato === 'Sem Instalação / Com Frete') return 'SEM INSTALAÇÃO / COM ENTREGA';
  return 'COM INSTALAÇÃO / COM CONTRAMARCO';
}

async function lerOrcamentoXLS(file) {
  const text = await file.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'application/xml');
  const ns = 'urn:schemas-microsoft-com:office:spreadsheet';
  const cells = xml.getElementsByTagNameNS(ns, 'Cell');
  const values = [];
  for (const cell of cells) {
    const data = cell.getElementsByTagNameNS(ns, 'Data')[0];
    if (data?.textContent?.trim()) values.push(data.textContent.trim());
  }
  const result = {};
  values.forEach((val, i) => {
    if (val === 'Proposta Nº' && values[i + 1]) result.pp = values[i + 1];
    if (val === 'Cliente:' && values[i + 1]) result.cliente = values[i + 1];
    if (val === 'Total Orçamento:' && values[i + 2]) result.valor = values[i + 2].replace('R$:', 'R$').trim();
    if (val === 'Observações:' && values[i + 1] && values[i + 1] !== 'Condições e Forma de Pagamento:') result.obs = values[i + 1];
  });
  const nonEmpty = values.filter((v) => v.length > 0);
  if (nonEmpty[2] && !nonEmpty[2].includes('/')) result.cidade = nonEmpty[2];
  return result;
}

export default function NovaObra() {
  const [form, setForm] = useState(inicial);
  const [importado, setImportado] = useState(null);
  const { criarObra } = useObrasContext();
  const { mostrarToast } = useApp();
  const navigate = useNavigate();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function importarXLS(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dados = await lerOrcamentoXLS(file);
    setForm((f) => ({ ...f, ...dados }));
    setImportado((prev) => ({ ...prev, orcamento: dados }));
    mostrarToast('Dados importados do orçamento.', 'success');
    e.target.value = '';
  }

  async function importarJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const contrato = JSON.parse(await file.text());
    const dados = {
      cliente: contrato.cliente || contrato.nome || '',
      pp: contrato.pp || contrato.proposta || '',
      cidade: contrato.cidade || '',
      tipo: mapearTipo(contrato.tipo || contrato.tipoInstalacao || contrato.tipo_instalacao),
      valor: contrato.valor || contrato.valorTotal || '',
      pagamento: contrato.pagamento || contrato.condicaoPagamento || '',
      fechamento: contrato.dataContrato || contrato.data || '',
      cpf: contrato.cpf || '',
      endereco: contrato.endereco || '',
    };
    setForm((f) => ({ ...f, ...Object.fromEntries(Object.entries(dados).filter(([, v]) => v)) }));
    setImportado((prev) => ({ ...prev, contrato: dados }));
    mostrarToast('Dados importados do contrato.', 'success');
    e.target.value = '';
  }

  function salvar(e) {
    e.preventDefault();
    const nova = criarObra(form);
    navigate(`/obras/${nova.id}`);
  }

  return (
    <form onSubmit={salvar}>
      <BotaoVoltar para="/obras" />
      <div className="flex-between mb-20"><div><div className="page-title">Nova Obra</div><div className="text-muted fs-12 mt-4">Cadastro em cinco seções, preparado para Firebase.</div></div><Button type="submit">Cadastrar Obra</Button></div>
      <section className="card card-pad mb-16">
        <div className="section-hdr"><div className="section-titulo">Importação de Arquivos</div></div>
        <div className="import-actions">
          <label className="btn btn-success">Ã°Å¸“â€ž Importar Orçamento XLS<input hidden type="file" accept=".xls,.xml" onChange={importarXLS} /></label>
          <label className="btn btn-success">Ã°Å¸“â€¹ Importar Contrato JSON<input hidden type="file" accept=".json" onChange={importarJSON} /></label>
        </div>
        {importado && <div className="import-resumo">
          <div>✓ Cliente: <b>{form.cliente || '-'}</b></div>
          <div>✓ PP: <b>{form.pp || '-'}</b></div>
          <div>✓ Cidade: <b>{form.cidade || '-'}</b></div>
          <div>✓ Valor: <b>{form.valor || '-'}</b></div>
          <div>✓ Tipo: <b>{form.tipo}</b></div>
        </div>}
      </section>
      <section className="card card-pad mb-16">
        <div className="section-hdr"><div className="section-titulo">1. Identificação</div></div>
        <div className="form-grid">
          <div className="form-field"><label>PP</label><input required value={form.pp} onChange={(e) => set('pp', e.target.value)} placeholder="PP-0000" /></div>
          <div className="form-field"><label>Cliente</label><input required value={form.cliente} onChange={(e) => set('cliente', e.target.value)} /></div>
          <div className="form-field"><label>Cidade</label><input required value={form.cidade} onChange={(e) => set('cidade', e.target.value)} /></div>
          <div className="form-field"><label>Tipo de serviço</label><select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>{TIPOS_SERVICO.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className="form-field"><label>CPF</label><input value={form.cpf} onChange={(e) => set('cpf', e.target.value)} /></div>
          <div className="form-field"><label>Endereço</label><input value={form.endereco} onChange={(e) => set('endereco', e.target.value)} /></div>
        </div>
      </section>
      <section className="card card-pad mb-16">
        <div className="section-hdr"><div className="section-titulo">2. Comercial</div></div>
        <div className="form-grid">
          <div className="form-field"><label>Fechamento</label><input value={form.fechamento} onChange={(e) => set('fechamento', e.target.value)} placeholder="DD/MM/AAAA" /></div>
          <div className="form-field"><label>Prazo manual</label><input type="date" value={form.prazo} onChange={(e) => set('prazo', e.target.value)} /></div>
          <div className="form-field">
            <label>Prazo prometido ao cliente</label>
            <input type="date" value={form.prazoCliente || ''} min={new Date().toISOString().split('T')[0]} onChange={(e) => set('prazoCliente', e.target.value)} />
            <small className="text-muted fs-11">Data que o cliente espera receber a obra.</small>
          </div>
        </div>
      </section>
      <section className="card card-pad mb-16">
        <div className="section-hdr"><div className="section-titulo">3. Financeiro</div></div>
        <div className="form-grid">
          <div className="form-field"><label>Valor</label><input value={form.valor} onChange={(e) => set('valor', e.target.value)} /></div>
          <div className="form-field"><label>Pagamento</label><input value={form.pagamento} onChange={(e) => set('pagamento', e.target.value)} /></div>
        </div>
      </section>
      <section className="card card-pad mb-16">
        <div className="section-hdr"><div className="section-titulo">4. Observações</div></div>
        <div className="form-field"><label>Observação operacional</label><textarea value={form.obs} onChange={(e) => set('obs', e.target.value)} /></div>
      </section>
      <section className="card card-pad">
        <div className="section-hdr"><div className="section-titulo">5. Integrações Futuras</div></div>
        <div className="text-muted fs-12">Cadastro local neste MVP. Firebase, IA, WhatsApp e VHSys entram nos pontos comentados no código.</div>
        {/* FIREBASE: salvar a nova obra em /obras. */}
        {/* IA: analisar contrato/proposta e sugerir próximos passos. */}
        {/* WHATSAPP: aceitar gatilho NOVO PEDIDO para criar obra. */}
        {/* VHSYS: preparar JSON do pedido para cadastro futuro. */}
      </section>
    </form>
  );
}

