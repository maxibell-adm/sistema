import Button from './Button.jsx';

export default function Modal({ titulo, children, onClose, footer }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal">
        <div className="modal-header">{titulo}</div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">{footer || <Button variant="secondary" onClick={onClose}>Fechar</Button>}</div>
      </div>
    </div>
  );
}


