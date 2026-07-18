import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TIPOS_SERVICO } from '@/config/constantes.js';
import { useApp } from '@/modules/layout/AppContext.jsx';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import {
  concluirLembrete,
  listarPreCadastros,
  removerPreCadastro,
} from '@/modules/contratos/contratosService.js';
import BotaoVoltar from '@/modules/ui/BotaoVoltar.jsx';
import Button from '@/modules/ui/Button.jsx';

const inicial = {
  pp: '',
  cliente: '',
  cidade: '',
  tipo: TIPOS_SERVICO[0],
  fechamento: '',
  valor: '',
  pagamento: '',
  prazo: '',
  prazoCliente: '',
  obs: '',
  cpf: '',
  endereco: '',
  temContrato: false,
  semXLS: false,
  precadastroPP: null,
};

function mapearTipo(tipoContrato) {
  if (!tipoContrato) return TIPOS_SERVICO[0];
  const t = tipoContrato.toLowerCase();
  if (t.includes('contramarco')) return 'COM INSTALAÇÃO / COM CONTRAMARCO';
  if (t.includes('alvenaria')) return 'COM INSTALAÇÃO / SEM CONTRAMARCO';
  if (t.includes('sem') && t.includes('instal')) return 'SEM INSTALAÇÃO / COM ENTREGA';
  return TIPOS_SERVICO[0];
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
    if (val === 'Observações:' && values[i + 1] && values[i + 1] !== 'Condições e Forma de Pagamento:') {
      result.obs = values[i + 1];
    }
  });
  const nonEmpty = values.filter((v) => v.length > 0);
  if (nonEmpty[2] && !nonEmpty[2].includes('/')) result.cidade = nonEmpty[2];
  return result;
}

function formatarValor(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '—';
  return `R$ ${numero.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function NovaObra() {
  const [form, setForm] = useState(inicial);
  const [importado, setImportado] = useState(null);
  const [precadastros, setPrecadastros] = useState([]);
  const [buscaPC, setBuscaPC] = useState('');
  const { criarObra } = useObrasContext();
  const { mostrarToast } = useApp();
  const navigate = useNavigate();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    setPrecadastros(listarPreCadastros());
  }, []);

  const pcFiltrados = precadastros.filter((pc) => (
    !buscaPC ||
    pc.pp?.toLowerCase().includes(buscaPC.toLowerCase()) ||
    pc.cliente?.toLowerCase().includes(buscaPC.toLowerCase())
  ));

  function diasDesde(isoStr) {
    return Math.floor((Date.now() - new Date(isoStr)) / 86400000);
  }

  function usarPreCadastro(pc) {
    setForm((f) => ({
      ...f,
      pp: pc.pp,
      cliente: pc.cliente,
      cidade: pc.cidade,
      cpf: pc.cpf || '',
      endereco: pc.endereco || '',
      valor: pc.valor ? String(pc.valor) : '',
      tipo: mapearTipo(pc.tipo),
      pagamento: pc.pagamento
        ? (pc.pagamento.modo === 'avista' ? 'À vista' : `${pc.pagamento.entrada}% entrada + ${pc.pagamento.parcelas}x`)
        : '',
      temContrato: true,
      precadastroPP: pc.pp,
    }));
    mostrarToast(`Dados de ${pc.pp} carregados. Complete os campos operacionais.`, 'success');
  }

  function ignorarPreCadastro(pp) {
    removerPreCadastro(pp);
    setPrecadastros(listarPreCadastros());
    mostrarToast('Pré-cadastro removido.', 'info');
  }

  async function importarXLS(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dados = await lerOrcamentoXLS(file);
    setForm((f) => ({ ...f, ...dados, semXLS: false }));
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
      tipo: mapearTipo(contrato.tipo || contrato.tipoInstalacao || contrato.tipo_instalacao || ''),
      valor: contrato.valor || contrato.valorTotal || '',
      pagamento: contrato.pagamento || contrato.condicaoPagamento || '',
      fechamento: contrato.dataContrato || contrato.data || '',
      cpf: contrato.cpf || '',
      endereco: contrato.endereco || '',
      temContrato: true,
    };
    setForm((f) => ({ ...f, ...Object.fromEntries(Object.entries(dados).filter(([, v]) => v)) }));
    setImportado((prev) => ({ ...prev, contrato: dados }));
    mostrarToast('Dados importados do contrato.', 'success');
    e.target.value = '';
  }

  function salvar(e) {
    e.preventDefault();
    const nova = criarObra({
      ...form,
      pedidoGenerico: form.semXLS,
    });
    if (form.precadastroPP) {
      removerPreCadastro(form.precadastroPP);
      concluirLembrete(form.precadastroPP);
    }
    navigate(`/obras/${nova.id}`);
  }

  return (
    <form onSubmit={salvar}>
      <BotaoVoltar para="/obras" />
      <div className="flex-between mb-20">
        <div>
          <div className="page-title">Nova Obra</div>
          <div className="text-muted fs-12 mt-4">Cadastro direto ou a partir de pré-cadastro do Gerador de Contratos.</div>
        </div>
        <Button type="submit">Cadastrar Obra</Button>
      </div>

      {precadastros.length > 0 && (
        <section className="card card-pad mb-16" style={{ borderTop: '3px solid var(--azul-claro)' }}>
          <div className="section-hdr">
            <div className="section-titulo">📄 Contratos recentes disponíveis</div>
            <span className="fs-11 text-muted">{precadastros.length} pré-cadastro{precadastros.length > 1 ? 's' : ''}</span>
          </div>
          {precadastros.length > 2 && (
            <input
              className="busca-input mb-12"
              placeholder="Buscar por PP ou cliente..."
              value={buscaPC}
              onChange={(e) => setBuscaPC(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pcFiltrados.map((pc) => {
              const dias = diasDesde(pc.geradoEm);
              return (
                <div key={pc.pp} className="pc-card" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--cinza-claro)', border: '1px solid var(--cinza-borda)', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 12, fontWeight: 800, color: 'var(--azul)' }}>{pc.pp} — {pc.cliente}</div>
                    <div style={{ fontSize: 11, color: 'var(--cinza-medio)', marginTop: 2 }}>
                      {pc.cidade} · {pc.tipo} · {pc.valor ? formatarValor(pc.valor) : '—'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--cinza-medio)', marginTop: 1 }}>
                      Gerado há {dias} dia{dias !== 1 ? 's' : ''} por {pc.responsavel || 'Sistema'}
                    </div>
                  </div>
                  {dias >= 5 && <span className="badge badge-alerta" style={{ fontSize: 9 }}>{dias}+ dias</span>}
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => usarPreCadastro(pc)}>Usar contrato</button>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => ignorarPreCadastro(pc.pp)}>Ignorar</button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="card card-pad mb-16">
        <div className="section-hdr"><div className="section-titulo">Importação de Arquivos</div></div>
        <div className="import-actions">
          <label className="btn-importar xls">Importar Orçamento XLS<input hidden type="file" accept=".xls,.xml" onChange={importarXLS} /></label>
          <label className="btn-importar json">Importar Contrato JSON<input hidden type="file" accept=".json" onChange={importarJSON} /></label>
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input id="semXLS" type="checkbox" checked={form.semXLS} onChange={(e) => set('semXLS', e.target.checked)} />
          <label htmlFor="semXLS" style={{ fontSize: 12, color: 'var(--cinza-medio)', cursor: 'pointer' }}>Obra sem detalhamento de produtos (pedido genérico)</label>
        </div>
        {form.semXLS && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--azul-bg)', border: '1px solid var(--azul-claro)', borderRadius: 6, fontSize: 11, color: 'var(--azul)' }}>
            📋 O VHSYS receberá um item genérico: <em>"Serviço/fornecimento de esquadrias referente à obra {form.pp || 'PP-XXXX'}"</em>.
            Os dados financeiros abaixo são obrigatórios.
          </div>
        )}
        {importado && (
          <div className="import-resumo">
            <div>Cliente: <b>{form.cliente || '-'}</b></div>
            <div>PP: <b>{form.pp || '-'}</b></div>
            <div>Cidade: <b>{form.cidade || '-'}</b></div>
            <div>Valor: <b>{form.valor || '-'}</b></div>
            <div>Tipo: <b>{form.tipo}</b></div>
          </div>
        )}
      </section>

      <section className="card card-pad mb-16">
        <div className="section-hdr">
          <div className="section-titulo">1. Identificação</div>
          {form.temContrato && <span className="badge badge-ok" style={{ fontSize: 9 }}>📄 Com contrato</span>}
        </div>
        <div className="form-grid">
          <div className="form-field"><label>PP *</label><input required value={form.pp} onChange={(e) => set('pp', e.target.value)} placeholder="PP-0000" /></div>
          <div className="form-field"><label>Cliente *</label><input required value={form.cliente} onChange={(e) => set('cliente', e.target.value)} /></div>
          <div className="form-field"><label>Cidade *</label><input required value={form.cidade} onChange={(e) => set('cidade', e.target.value)} /></div>
          <div className="form-field"><label>Tipo de serviço *</label><select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>{TIPOS_SERVICO.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className="form-field"><label>CPF / CNPJ</label><input value={form.cpf} onChange={(e) => set('cpf', e.target.value)} /></div>
          <div className="form-field"><label>Endereço de instalação</label><input value={form.endereco} onChange={(e) => set('endereco', e.target.value)} /></div>
        </div>
      </section>

      <section className="card card-pad mb-16">
        <div className="section-hdr"><div className="section-titulo">2. Comercial</div></div>
        <div className="form-grid">
          <div className="form-field"><label>Fechamento</label><input value={form.fechamento} onChange={(e) => set('fechamento', e.target.value)} placeholder="DD/MM/AAAA" /></div>
          <div className="form-field"><label>Prazo interno</label><input type="date" value={form.prazo} onChange={(e) => set('prazo', e.target.value)} /></div>
          <div className="form-field"><label>Prazo prometido ao cliente</label><input type="date" value={form.prazoCliente || ''} min={new Date().toISOString().split('T')[0]} onChange={(e) => set('prazoCliente', e.target.value)} /><small className="text-muted fs-11">Data que o cliente espera receber a obra.</small></div>
          <div className="form-field"><label>Valor do contrato (R$) *</label><input required type="text" value={form.valor || ''} onChange={(e) => set('valor', e.target.value)} placeholder="Ex: 15.000,00" autoComplete="off" /><small className="fs-10 text-muted">Obrigatório mesmo para obras sem XLS.</small></div>
        </div>
      </section>

      <section className="card card-pad mb-16">
        <div className="section-hdr"><div className="section-titulo">3. Financeiro</div></div>
        <div className="form-grid">
          <div className="form-field full"><label>Condição de pagamento *</label><input required value={form.pagamento} onChange={(e) => set('pagamento', e.target.value)} placeholder="Ex: 30% entrada + 3x mensais" /><small className="fs-10 text-muted">Obrigatório — dados financeiros não são opcionais.</small></div>
        </div>
      </section>

      <section className="card card-pad mb-16">
        <div className="section-hdr"><div className="section-titulo">4. Observações</div></div>
        <div className="form-field"><label>Observação operacional</label><textarea value={form.obs} onChange={(e) => set('obs', e.target.value)} rows={3} /></div>
      </section>

      <section className="card card-pad">
        <div className="section-hdr"><div className="section-titulo">5. Integrações Futuras</div></div>
        <div className="text-muted fs-12">Cadastro local neste MVP. Firebase, IA, WhatsApp e VHSYS entram nas próximas fases.</div>
        {form.semXLS && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--cinza-medio)' }}>
            <b>[VHSYS]</b> Item genérico preparado para lançamento futuro via Agente de Pedidos.<br />
            <b>[IA]</b> Valor e condição de pagamento registrados para lançamento no contas a receber.
          </div>
        )}
        {/* FIREBASE: salvar a nova obra em /obras. */}
        {/* IA: analisar contrato/proposta e sugerir próximos passos. */}
        {/* WHATSAPP: aceitar gatilho NOVO PEDIDO para criar obra. */}
        {/* VHSYS: preparar JSON do pedido para cadastro futuro. */}
        {/* EVENTO_OBRA_ATIVADA: disparar quando obra for criada - gatilho para funil e integrações. */}
      </section>
    </form>
  );
}
