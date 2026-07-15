import { Link } from 'react-router-dom';
import { ETAPAS, labelEtapa } from '@/config/etapas.js';
import { carregarUsuarios } from '@/config/usuarios.js';
import { calcPrazo } from '@/rules/prazosRules.js';
import { labelTipoOCCurto } from '@/rules/eventosRules.js';
import Badge from '@/modules/ui/Badge.jsx';

export default function ObraCard({ obra, compact = false, draggable = false, onDragStart }) {
  const etapa = ETAPAS.find((e) => e.id === obra.etapa);
  const prazo = calcPrazo(obra.prazo);
  const nomeResponsavel = obra.responsavelExecucao || obra.responsavel || '';
  const usuarioBase = carregarUsuarios().find((u) => u.nome === nomeResponsavel || u.nome === obra.responsavel) || { cor: '#7F8C8D', avatar: '??' };
  const avatar = nomeResponsavel.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || usuarioBase.avatar;
  const vhsysPendente = obra.etapa === 'pedido_inicial' && (
    !obra.vhsysEsquadria?.trim() ||
    (obra.tipo === 'COM INSTALACAO / COM CONTRAMARCO' && !obra.vhsysContramarco?.trim())
  );

  return (
    <Link
      className={`obra-mini ${compact ? 'compact' : ''}`}
      style={{ borderTopColor: etapa?.cor }}
      to={`/obras/${obra.id}`}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      {obra.pendencia?.aberta && <span className="parado-tag pendencia">PENDENCIA</span>}
      {obra.ehCardOC && <div className="card-oc-badge">OC - {labelTipoOCCurto(obra.ocorrênciaTipo)}</div>}
      <div className="obra-mini-pp">{obra.pp}</div>
      <div className="obra-mini-cliente">{obra.cliente}</div>
      <div className="obra-card-badges">
        {vhsysPendente && <span className="badge badge-alerta">VHSYS pendente</span>}
        {obra.condicaoEspecial?.ativa && <span className="badge badge-alerta">Condição especial</span>}
        {obra.ehFase && <span className="badge badge-info">Fase {obra.fase}</span>}
        {!obra.ehFase && obra.fasesAdicionais > 0 && <span className="badge badge-sem">{obra.fasesAdicionais} fase{obra.fasesAdicionais > 1 ? 's' : ''} adicional</span>}
      </div>
      {obra.ehCardCM && <span className="badge badge-alerta">Card CM</span>}
      {obra.ehFase && <div className="obra-origem">Originada de {obra.obraMaePP}</div>}
      {obra.ehCardCM && <div className="obra-origem">Contramarco de {obra.obraMaePP}</div>}
      {obra.ehCardOC && <div className="card-oc-origem fs-10 text-muted">Ocorrência de {obra.obraMaePP}</div>}
      <div className="obra-mini-cidade">{obra.cidade}</div>
      <div className="obra-mini-footer">
        <div className="mini-resp"><span className="mini-avatar" style={{ background: usuarioBase.cor }}>{avatar}</span>{nomeResponsavel}</div>
        <Badge classe={prazo.classe}>{prazo.label}</Badge>
      </div>
      <div className="mt-8"><span className="etapa-pill">{labelEtapa(obra.etapa)}</span></div>
    </Link>
  );
}
