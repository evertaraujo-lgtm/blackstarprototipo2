import { describe, it, expect } from 'vitest';
import { avaliarFronteiraAproximacao, configurarFronteiraAproximacao, type EstadoFronteiraAproximacao } from '../physics/sistemas de controle/FronteiraAproximacao';
import { SupervisorRecuperacao } from '../physics/sistemas de controle/SupervisorRecuperacao';
import { ControladorAproximacao } from '../physics/sistemas de controle/ControladorAproximacao';
import { GerenciadorDeControladores, type ControladorDeVoo } from '../physics/sistemas de controle/GerenciadorDeControladores';
import { EnsaioReentrada, validarComandoReentrada } from './EnsaioReentrada';
import { Vetor3 } from '../physics/Vetor3';

const criterios = configurarFronteiraAproximacao({ alvoArcoM: 200000 });
const bom: EstadoFronteiraAproximacao = { altitudeM: 10000, arcoM: 0, velocidadeMps: 500,
  velocidadeRadialMps: -20, velocidadeTangencialMps: Math.sqrt(500 ** 2 - 20 ** 2),
  alphaRad: 0.7, alphaAlvoRad: 0.7, omegaRadps: 0.001, energiaMecanicaEspecificaJPorKg: -6e7,
  sensoresValidos: true, integridade: 1, integridadeFlaps: 1, termicaCompativel: true, alimentacaoDisponivel: true,
  autoridadeAerodinamicaDisponivel: true, corredorCompativel: true, propulsaoDisponivel: true, integracaoCompativel: true };
function registro() {
  const g = new GerenciadorDeControladores();
  for (const id of ['reentrada', 'aproximacao', 'pouso']) {
    let habilitado = false;
    const c: ControladorDeVoo = { id, prioridade: 1, get estaHabilitado() { return habilitado; },
      habilitar() { habilitado = true; }, desabilitar() { habilitado = false; }, calcularSolicitacoes() { return []; } };
    g.registrar(c);
  }
  g.habilitar('reentrada'); return g;
}
describe('RE-002D fronteira paramétrica, sem instalação propulsiva', () => {
  it('separa candidato hipotético de autorização real e calcula desvio rastreável', () => {
    const a = avaliarFronteiraAproximacao({ ...bom, propulsaoDisponivel: false }, criterios);
    expect(a.candidatoCinematico).toBe(true); expect(a.autorizado).toBe(false);
    expect(a.hipoteses[0].distanciaFrenagemM).toBe(125000);
    expect(a.hipoteses[0].desvioVelocidadeMps).toBeCloseTo(500 - Math.sqrt(400000));
    expect(avaliarFronteiraAproximacao(bom, criterios).autorizado).toBe(true);
  });
  it.each([
    { velocidadeMps: 10000 }, { altitudeM: 0 }, { altitudeM: 1, velocidadeRadialMps: -500 },
    { sensoresValidos: false }, { integridadeFlaps: 0 }, { alimentacaoDisponivel: false },
    { integridade: 0 }, { termicaCompativel: false }, { autoridadeAerodinamicaDisponivel: false },
    { corredorCompativel: false }, { omegaRadps: 0.1 }, { alphaRad: -1 }, { arcoM: 300000 },
    { velocidadeRadialMps: 20 }, { velocidadeTangencialMps: -500 }, { velocidadeMps: NaN },
  ])('bloqueia condição parcial/incompatível %o', alteracao => {
    const a = avaliarFronteiraAproximacao({ ...bom, ...alteracao }, criterios);
    expect(a.candidatoCinematico).toBe(false); expect(a.autorizado).toBe(false);
  });
  it('alvo ausente não assume região; antigos limites de pouso não entram no critério', () => {
    expect(avaliarFronteiraAproximacao(bom, configurarFronteiraAproximacao()).candidatoCinematico).toBe(false);
    expect(avaliarFronteiraAproximacao(bom, criterios).candidatoCinematico).toBe(true); // 10 km / 500 m/s
    expect(() => configurarFronteiraAproximacao({ aceleracoesLiquidasHipoteticasMps2: [0] })).toThrow();
    expect(() => configurarFronteiraAproximacao({ omegaMaxRadps: NaN })).toThrow();
    const entrada = [1, 2]; const c = configurarFronteiraAproximacao({ aceleracoesLiquidasHipoteticasMps2: entrada });
    entrada[0] = 3; expect(c.aceleracoesLiquidasHipoteticasMps2[0]).toBe(1);
  });
  it('troca posse exclusivamente para aproximação e retira todos em falha travada', () => {
    const g = registro(), s = new SupervisorRecuperacao(g, criterios);
    s.solicitarAproximacao(); s.atualizar(bom); expect(g.idsAtivos()).toEqual(['aproximacao']);
    expect(s.observar().fase).toBe('aproximacao');
    s.atualizar({ ...bom, propulsaoDisponivel: false }); expect(g.idsAtivos()).toEqual([]);
    s.solicitarAproximacao(); s.atualizar(bom); expect(g.idsAtivos()).toEqual([]); expect(s.observar().autorizado).toBe(false);
  });
  it('não transfere posse por candidato sem propulsão e exige pedido ou modo automático', () => {
    const g = registro(), s = new SupervisorRecuperacao(g, criterios);
    s.atualizar(bom); expect(g.idsAtivos()).toEqual(['reentrada']);
    s.definirAutomatico(true); s.atualizar({ ...bom, propulsaoDisponivel: false }); expect(g.idsAtivos()).toEqual(['reentrada']);
    s.atualizar(bom); expect(g.idsAtivos()).toEqual(['aproximacao']);
  });
  it('retira controles por sensor inválido e impede reabilitação implícita', () => {
    const g = registro(), s = new SupervisorRecuperacao(g, criterios);
    s.atualizar({ ...bom, sensoresValidos: false }); expect(g.idsAtivos()).toEqual([]);
    s.atualizar(bom); expect(s.observar().fase).toBe('falha');
  });
  it('modo manual inicial mantém portas utilizáveis sem selecionar automação', () => {
    const e = new EnsaioReentrada({ automatico: false });
    expect(e.observar().controle.estado).toBe('manual');
    expect(e.receberComando({ tipo: 'flaps', dianteiroRad: 0.1, traseiroRad: -0.1 }).aceito).toBe(true);
    e.iniciar(); e.avancarPasso(); expect(e.observar().arbitragem).toEqual([]);
  });
  it('estado real de menor energia pode ser A, registra cruzamento por passo e continua bloqueado em B', () => {
    const e = new EnsaioReentrada({ altitudeM: 65000, velocidadeMps: 2500, trajetoriaRad: -5 * Math.PI / 180,
      aproximacao: { alvoArcoM: 2e6 } });
    const inicial = e.observar(); expect(inicial.supervisor.candidatoCinematico).toBe(true);
    expect(inicial.supervisor.autorizado).toBe(false);
    expect(e.receberComando({ tipo: 'aproximacao' }).aceito).toBe(false);
    expect(e.observar().estado).toEqual(inicial.estado);
    e.iniciar(); e.avancarPasso();
    expect(e.obterEventos().find(v => v.tipo === 'candidato-aproximacao')).toMatchObject({ passo: 1, dados: { ativo: true } });
    expect(e.observar().supervisor.fase).toBe('reentrada');
  });
  it('protótipo aproximação não pede força nem modifica leituras e RE bloqueia ambos pedidos', () => {
    const c = new ControladorAproximacao({ alvoArcoM: 1000 }); c.habilitar();
    const l = Object.freeze({ posicaoGpsM: new Vetor3(0, 10, 0), altitudeM: 10, velocidadeVerticalMps: -20,
      velocidadeHorizontalMps: 300, inclinacaoRad: 0 });
    expect(c.calcularSolicitacoes(l, 1 / 240)).toEqual([]); expect(c.estaHabilitado).toBe(true);
    expect(() => c.calcularSolicitacoes(l, 1)).toThrow(); c.desabilitar(); expect(c.estaHabilitado).toBe(false);
    const e = new EnsaioReentrada({ aproximacao: { alvoArcoM: 2e6 } });
    expect(validarComandoReentrada({ tipo: 'aproximacao' })).toBe(true);
    expect(e.receberComando({ tipo: 'pouso' })).toMatchObject({ aceito: false });
    expect(e.receberComando({ tipo: 'aproximacao' })).toMatchObject({ aceito: false });
    expect(e.observar().supervisor.fase).toBe('reentrada'); expect(e.observar().propulsaoDisponivel).toBe(false);
  });
});
