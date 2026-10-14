import type { EstadoImersao } from '../physics/agua/SistemaHidrodinamico';
import { Vetor3 } from '../physics/Vetor3';

export interface ObservacaoAmerissagem {
  readonly estado: 'seco' | 'entrada' | 'flutuacao-instavel' | 'tombamento' | 'oscilacao' | 'flutuacao-estavel' | 'imersao-completa' | 'afundamento' | 'apoio-solido-submerso';
  readonly volumeSubmersoM3: number; readonly volumeDeslocavelM3: number; readonly fracaoSubmersa: number;
  readonly centroEmpuxoM?: Vetor3; readonly centroMassaM: Vetor3;
  readonly forcaEmpuxoN: Vetor3; readonly forcaArrastoN: Vetor3; readonly momentoHidrodinamicoNm: Vetor3;
  readonly velocidadeEntradaMps: number; readonly energiaEntradaJ: number; readonly potenciaDissipadaW: number;
  readonly equilibrioContinuoS: number; readonly equilibrioObservado: boolean;
  readonly componentes: readonly EstadoImersao[];
}
export interface MedidasAmerissagem {
  readonly componentes: readonly EstadoImersao[]; readonly G: Vetor3; readonly massaKg: number;
  readonly gravidadeMps2: number; readonly velocidadeMps: number; readonly velocidadeRadialMps: number;
  readonly atitudeRad: number; readonly omegaRadps: number; readonly empuxoMotorN: number;
  readonly contatoSolido: boolean;
}
/** Classificação observacional, sem forças ou acesso mutável ao veículo. */
export class AcompanhamentoAmerissagem {
  private equilibrioS = 0;
  private equilibrioRegistrado = false;
  private entradaRegistrada = false;
  private imersaoRegistrada = false;
  private tombamentoRegistrado = false;
  private afundamentoRegistrado = false;
  public observar(m: MedidasAmerissagem): ObservacaoAmerissagem {
    const c = m.componentes, V = c.reduce((s, x) => s + x.volumeSubmersoM3, 0), total = c.reduce((s, x) => s + x.volumeTotalM3, 0);
    const B = V > 0 ? m.G.adicionar(c.reduce((s, x) => s.adicionar((x.centroEmpuxoM ?? m.G).subtrair(m.G).multiplicar(x.volumeSubmersoM3 / V)), Vetor3.zero)) : undefined;
    const F = c.reduce((s, x) => s.adicionar(x.forcaEmpuxoN), Vetor3.zero), peso = m.massaKg * m.gravidadeMps2;
    const frac = total > 0 ? V / total : 0;
    const afundando = frac > 0.999 && F.magnitude < peso && m.velocidadeRadialMps < -0.1;
    const estado = V === 0 ? 'seco' : m.contatoSolido ? 'apoio-solido-submerso' : afundando ? 'afundamento' : frac > 0.999 ? 'imersao-completa'
      : this.equilibrioS >= 3 ? 'flutuacao-estavel' : Math.abs(m.omegaRadps) > 0.1 ? 'tombamento'
      : Math.abs(m.atitudeRad) > 0.2 ? 'oscilacao' : Math.abs(m.omegaRadps) > 0.01 ? 'flutuacao-instavel' : 'entrada';
    return { estado, volumeSubmersoM3: V, volumeDeslocavelM3: total, fracaoSubmersa: frac,
      centroEmpuxoM: B, centroMassaM: m.G, forcaEmpuxoN: F,
      forcaArrastoN: c.reduce((s, x) => s.adicionar(x.forcaArrastoN), Vetor3.zero),
      momentoHidrodinamicoNm: c.reduce((s, x) => s.adicionar(x.torqueHidrodinamicoNm), Vetor3.zero),
      velocidadeEntradaMps: Math.max(0, ...c.map(x => x.picoVelocidadeEntradaMps)),
      energiaEntradaJ: c.reduce((s, x) => s + x.energiaEntradaJ, 0), potenciaDissipadaW: c.reduce((s, x) => s + x.potenciaDissipadaW, 0),
      equilibrioContinuoS: this.equilibrioS, equilibrioObservado: this.equilibrioRegistrado, componentes: c };
  }
  public atualizar(m: MedidasAmerissagem, dtS: number): readonly string[] {
    const a = this.observar(m), peso = m.massaKg * m.gravidadeMps2, eventos: string[] = [];
    // Equilíbrio observado: força a 2%, braço residual equivalente de 2 cm, quietude e motor cortado por 3 s.
    const equilibrado = !m.contatoSolido && a.volumeSubmersoM3 > 0 && m.empuxoMotorN === 0 && m.velocidadeMps < 0.05 && Math.abs(m.omegaRadps) < 0.005
      && Math.abs(a.forcaEmpuxoN.magnitude / peso - 1) < 0.02 && Math.abs(a.momentoHidrodinamicoNm.z) < peso * 0.02;
    this.equilibrioS = equilibrado ? this.equilibrioS + dtS : 0;
    if (a.volumeSubmersoM3 > 0 && !this.entradaRegistrada) { this.entradaRegistrada = true; eventos.push('entrada-na-agua', 'imersao-parcial'); }
    if (a.fracaoSubmersa > 0.999 && !this.imersaoRegistrada) { this.imersaoRegistrada = true; eventos.push('imersao-completa'); }
    if (Math.abs(m.atitudeRad) > 0.2 && a.volumeSubmersoM3 > 0 && !this.tombamentoRegistrado) { this.tombamentoRegistrado = true; eventos.push('tombamento-observado'); }
    if (this.equilibrioS >= 3 && !this.equilibrioRegistrado) { this.equilibrioRegistrado = true; eventos.push('equilibrio-flutuacao-observado'); }
    if (a.estado === 'afundamento' && !this.afundamentoRegistrado) { this.afundamentoRegistrado = true; eventos.push('afundamento-observado'); }
    return eventos;
  }
}
