import type { ParametrosReentrada } from '../../physics/reentrada/ModeloAerodinamicoReentrada';

/** Rótulos e unidades de entrada; a validação e os padrões pertencem ao domínio. */
export const rotulosParametros: Readonly<Record<keyof ParametrosReentrada, string>> = {
  areaReferenciaM2: 'Área aerodinâmica do corpo (m²)', comprimentoM: 'Comprimento do corpo (m)',
  alturaM: 'Altura do corpo (m)', larguraM: 'Largura do corpo (m)', raioNarizM: 'Raio térmico do nariz (m)',
  areaAquecidaM2: 'Área aquecida do corpo (m²)', massaCorpoKg: 'Massa própria do corpo (kg)',
  massaFlapKg: 'Massa de cada flap (kg)', massaBateriaKg: 'Massa da bateria (kg)',
  resistenciaCorpoJ: 'Resistência a impacto do corpo (J)', resistenciaFlapJ: 'Resistência a impacto do flap (J)',
  resistenciaFixadorN: 'Resistência axial do fixador (N)', areaFlapM2: 'Área de cada flap (m²)',
  clFlapPorRad: 'Coeficiente de lift do flap (1/rad)', cdFlapBase: 'Cd básico do flap', cdFlapDeflexao: 'Variação de Cd com deflexão',
  cursoFlapRad: 'Curso máximo do flap (rad)', taxaFlapRadps: 'Taxa máxima do flap (rad/s)',
  bracoFlapM: 'Distância longitudinal dos flaps (m)', deslocamentoVerticalFlapM: 'Posição vertical local dos flaps (m)',
  potenciaFlapW: 'Potência elétrica em movimento (W)', potenciaRepousoFlapW: 'Potência elétrica em repouso (W)',
  tensaoBateriaV: 'Tensão da bateria (V)', energiaBateriaJ: 'Capacidade energética da bateria (J)',
  fracaoCargaInicialBateria: 'Carga inicial da bateria (fração 0–1)', ganhoAlpha: 'Ganho de atitude (1/s²)', ganhoTaxa: 'Ganho de taxa (1/s)',
  torqueMinimoAutoridadeNm: 'Autoridade mínima (N·m/rad)', taxaRolagemRadps: 'Taxa de bank prescrito (rad/s)', cursoRolagemRad: 'Curso de bank virtual (rad)',
  coeficienteSuttonGravesSI: 'Coeficiente Sutton–Graves (SI)', clCorpo: 'Amplitude de Cl do corpo', fatorMachBase: 'Fator base de Mach em Cl',
  fatorMachVariacao: 'Variação com Mach em Cl', cdCorpoBase: 'Cd básico do corpo', cdCorpoAlpha: 'Variação de Cd com ataque', cdMachGauss: 'Amplitude transônica de Cd',
  cpBaseM: 'Centro de pressão longitudinal base (m)', cpVariacaoM: 'Variação de CP com ataque (m)',
  raioNarizFlapM: 'Raio térmico do flap (m)', areaAquecidaFlapM2: 'Área aquecida de cada flap (m²)',
  calorEspecificoCorpoJPorKgC: 'Calor específico do corpo (J/kg·°C)', calorEspecificoFlapJPorKgC: 'Calor específico dos flaps (J/kg·°C)',
  comprimentoCaracteristicoCorpoM: 'Comprimento de rarefação do corpo (m)', comprimentoCaracteristicoFlapM: 'Comprimento de rarefação do flap (m)',
  conveccaoCorpoWPorM2C: 'Convecção ambiente do corpo (W/m²·°C)', condutanciaFlapWPorC: 'Condutância corpo–flap (W/°C)',
};
