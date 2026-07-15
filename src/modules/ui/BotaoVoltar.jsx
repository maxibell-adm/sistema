import { useNavigate } from 'react-router-dom';
import Button from './Button.jsx';

export default function BotaoVoltar({ para }) {
  const navigate = useNavigate();

  return (
    <div className="botao-voltar-wrap">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => (para ? navigate(para) : navigate(-1))}
      >
        Voltar
      </Button>
    </div>
  );
}
