/**
 * Converte numero para texto em portugues (reais e centavos).
 */
export function valorPorExtenso(n) {
  const valor = Number(n) || 0;
  if (valor === 0) return 'zero reais';
  const reais = Math.floor(valor);
  const centavos = Math.round((valor - reais) * 100);
  let texto = numeroExtenso(reais) + (reais === 1 ? ' real' : ' reais');
  if (centavos > 0) texto += ' e ' + numeroExtenso(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  return texto;
}

const unidadesExtenso = [];
unidadesExtenso[0] = '';
unidadesExtenso[1] = 'um';
unidadesExtenso[2] = 'dois';
unidadesExtenso[3] = 'três';
unidadesExtenso[4] = 'quatro';
unidadesExtenso[5] = 'cinco';
unidadesExtenso[6] = 'seis';
unidadesExtenso[7] = 'sete';
unidadesExtenso[8] = 'oito';
unidadesExtenso[9] = 'nove';
unidadesExtenso[10] = 'dez';
unidadesExtenso[11] = 'onze';
unidadesExtenso[12] = 'doze';
unidadesExtenso[13] = 'treze';
unidadesExtenso[14] = 'quatorze';
unidadesExtenso[15] = 'quinze';
unidadesExtenso[16] = 'dezesseis';
unidadesExtenso[17] = 'dezessete';
unidadesExtenso[18] = 'dezoito';
unidadesExtenso[19] = 'dezenove';

const dezenasExtenso = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const centenasExtenso = ['', 'cem', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function grupoExtenso(num) {
  if (num === 0) return '';
  if (num < 20) return unidadesExtenso[num];
  if (num < 100) {
    const dez = Math.floor(num / 10);
    const uni = num % 10;
    return dezenasExtenso[dez] + (uni ? ' e ' + unidadesExtenso[uni] : '');
  }
  if (num === 100) return 'cem';
  const cen = Math.floor(num / 100);
  const resto = num % 100;
  return centenasExtenso[cen] + (resto ? ' e ' + grupoExtenso(resto) : '');
}

function numeroExtenso(num) {
  if (num < 1000) return grupoExtenso(num);
  if (num < 1000000) {
    const mil = Math.floor(num / 1000);
    const resto = num % 1000;
    return (mil === 1 ? 'mil' : grupoExtenso(mil) + ' mil') + (resto ? ' e ' + grupoExtenso(resto) : '');
  }
  const mi = Math.floor(num / 1000000);
  const resto = num % 1000000;
  return grupoExtenso(mi) + (mi === 1 ? ' milhão' : ' milhões') + (resto ? ' e ' + numeroExtenso(resto) : '');
}

export function fmtR(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtData(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${parseInt(d, 10)} de ${meses[parseInt(m, 10) - 1]} de ${y}`;
}

export function fmtDataCurta(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

export function mascaraCPF(valor) {
  return valor
    .replace(/[^0-9]/g, '')
    .replace(/([0-9]{3})([0-9])/, '$1.$2')
    .replace(/([0-9]{3})([0-9])/, '$1.$2')
    .replace(/([0-9]{3})([0-9]{1,2})$/, '$1-$2');
}

export function mascaraCEP(valor) {
  return valor.replace(/[^0-9]/g, '').replace(/([0-9]{5})([0-9])/, '$1-$2');
}

export function hojeISO() {
  return new Date().toISOString().split('T')[0];
}

