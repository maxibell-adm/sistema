import { useState } from 'react';
import { RESPONSAVEIS_EXECUCAO } from '@/config/constantes.js';
import { useApp } from '@/modules/layout/AppContext.jsx';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import { usuarioPorRole } from '@/config/usuarios.js';
import Button from '@/modules/ui/Button.jsx';
import Modal from '@/modules/ui/Modal.jsx';

export default function ModalAgendarExecucao({ obra, tipoAtividade, onClose }) {
  const { criarAtividade, gerarNotificacao } = useApp();
  const { usuario } = useAuth();
  const { atualizarObra } = useObrasContext();
  const [form, setForm] = useState({
    pp: obra.pp,
    cliente: obra.cliente,
    cidade: obra.cidade,
    tipo: tipoAtividade,
    data: '',
    responsavelExecucao: '',
    obs: '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function agendar() {
    if (!form.data || !form.responsavelExecucao) return;

    // 1. Criar atividade na agenda
    criarAtividade({ ...form, criadoPor: usuario.nome, obraId: obra.id });

    const agora = new Date();

    // 2. Salvar dataAgendada na obra + histórico
    atualizarObra(obra.id, {
      dataAgendada: form.data,
      responsavelExecucao: form.responsavelExecucao,
      historico: [
        ...obra.historico,
        {
          data: agora.toLocaleDateString('pt-BR'),
          hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          usuario: usuario.nome,
          acao: `${tipoAtividade} agendada`,
          desc: `Data: ${form.data} · Responsável: ${form.responsavelExecucao}`,
          tipo: 'agenda',
        },
      ],
    });

    // 3. Alimentar fila de confirmação da Ana
    const tiposQueAnaConfirma = ['Instalação', 'Manutenção', 'Entrega'];
    if (tiposQueAnaConfirma.includes(tipoAtividade)) {
      const fila = JSON.parse(localStorage.getItem('maxibell.manutencao.aguardando_ana') || '[]');
      fila.unshift({
        id: `agenda-ana-${Date.now()}`,
        pp: obra.pp,
        cliente: obra.cliente,
        dataSugerida: form.data,
        hora: form.hora || '',
        motivo: `${tipoAtividade} agendada por ${usuario.nome}`,
        tipo: tipoAtividade,
        obraId: obra.id,
        status: 'aguardando',
      });
      localStorage.setItem('maxibell.manutencao.aguardando_ana', JSON.stringify(fila));

      // 4. Notificar Ana para confirmar com o cliente
      // [IA_WHATSAPP] Hook futuro: disparar mensagem WhatsApp/Kommo para o cliente
      // A confirmação aparece no banner pulsante do painel da Ana — não no sino
    }

    onClose();
  }

  return (
    <Modal titulo={`Agendar ${tipoAtividade}`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="success" onClick={agendar}>Agendar</Button></>}>
      <div className="form-grid">
        <div className="form-field"><label>PP</label><input value={form.pp} readOnly className="input-readonly" /></div>
        <div className="form-field"><label>Cliente</label><input value={form.cliente} readOnly className="input-readonly" /></div>
        <div className="form-field"><label>Cidade</label><input value={form.cidade} readOnly className="input-readonly" /></div>
        <div className="form-field"><label>Data <span className="obrigatorio">*</span></label><input type="date" value={form.data} min={new Date().toISOString().slice(0, 10)} onChange={(e) => set('data', e.target.value)} /></div>
        <div className="form-field full"><label>Responsável pela execução <span className="obrigatorio">*</span></label><select value={form.responsavelExecucao} onChange={(e) => set('responsavelExecucao', e.target.value)}><option value="">Selecione...</option>{RESPONSAVEIS_EXECUCAO.map((r) => <option key={r.id} value={r.label}>{r.label}</option>)}</select></div>
        <div className="form-field full"><label>Observações</label><textarea value={form.obs} onChange={(e) => set('obs', e.target.value)} /></div>
      </div>
    </Modal>
  );
}
