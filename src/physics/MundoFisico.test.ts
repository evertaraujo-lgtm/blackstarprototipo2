import { describe, expect, it } from 'vitest';
import { MundoFisico } from './MundoFisico';
import { Objeto } from './objetos/base/Objeto';
import { SuperficiePlano } from './SuperficiePlano';
import { Vetor3 } from './Vetor3';
import { FixadorEstrutural } from './conexoes/FixadorEstrutural';

const criarObjeto = (id = 'objeto') => new Objeto({
  id,
  massaBaseKg: 2,
  dimensoesM: new Vetor3(2, 2, 2),
  resistenciaColisaoJ: 100,
  resistenciaCalorK: 1_000,
});

const criarCuboDensoEmQueda = (alturaM: number) => new Objeto({
  id: `cubo-${alturaM}`,
  massaBaseKg: 10,
  dimensoesM: new Vetor3(1, 1, 1),
  resistenciaColisaoJ: 10_000,
  resistenciaCalorK: 1_000,
  estadoInicial: { posicaoM: new Vetor3(0, alturaM, 0) },
});

const simularQuedaLivreAteSolo = (alturaM: number) => {
  const passoS = 0.001;
  const mundo = new MundoFisico(passoS);
  const objeto = criarCuboDensoEmQueda(alturaM);
  mundo.registrarObjeto(objeto);

  while (objeto.getEstadoFisico().posicaoM.y > 0) {
    mundo.avancar(passoS);
  }

  return { tempoS: mundo.tempoS, velocidadeImpactoMps: -objeto.getEstadoFisico().velocidadeMps.y };
};

describe('MundoFisico', () => {
  it('aplica gravidade terrestre de modo determinístico', () => {
    const mundo = new MundoFisico(1);
    const objeto = criarObjeto();
    mundo.registrarObjeto(objeto);

    mundo.avancar(1);

    expect(objeto.getEstadoFisico().velocidadeMps.y).toBeCloseTo(-9.80665, 10);
    expect(objeto.getEstadoFisico().posicaoM.y).toBeCloseTo(-9.80665, 10);
    expect(mundo.tempoS).toBe(1);
  });

  it('converte força resultante em aceleração conforme a massa instantânea', () => {
    const mundo = new MundoFisico(1);
    const objeto = criarObjeto();
    objeto.definirMassaVariavelKg(8);
    mundo.registrarObjeto(objeto);
    mundo.aplicarForca(objeto, new Vetor3(100, 98.0665, 0));

    mundo.avancar(1);

    expect(objeto.massaKg).toBe(10);
    expect(objeto.getEstadoFisico().velocidadeMps.x).toBeCloseTo(10, 10);
    expect(objeto.getEstadoFisico().velocidadeMps.y).toBeCloseTo(0, 10);
  });

  it('transfere calor convectivo de um jato térmico para objeto no seu cone', () => {
    class FonteTermica extends Objeto {
      public override obterJatoTermico() { return { potenciaW: 10_000, alcanceM: 10, aberturaRad: Math.PI / 6, direcaoM: new Vetor3(1, 0, 0) }; }
    }
    const mundo = new MundoFisico(1, { densidadeAtmosfericaKgM3: 0, temperaturaAmbienteC: 20 });
    const fonte = new FonteTermica({ id: 'fonte-termica', massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 1_000, resistenciaCalorK: 1_000, estadoInicial: { posicaoM: Vetor3.zero } });
    const alvo = new Objeto({ id: 'alvo-termico', massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 1_000, resistenciaCalorK: 1_000, capacidadeTermicaJPorC: 100, estadoInicial: { posicaoM: new Vetor3(5, 0, 0) } });
    mundo.registrarObjeto(fonte); mundo.registrarObjeto(alvo);
    mundo.avancar(1);
    expect(alvo.temperaturaC).toBeGreaterThan(20);
  });

  it('não inverte o deslocamento de uma bancada rígida quando uma força horizontal baixa é aplicada', () => {
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 0 });
    const solo = new SuperficiePlano('solo-bancada-direcao', 'concreto', 0, 1_000_000);
    const fundacao = new Objeto({ id: 'fundacao-direcao', massaBaseKg: 500_000, dimensoesM: new Vetor3(12, 4, 2), resistenciaColisaoJ: 10_000_000, resistenciaCalorK: 1_000, estadoInicial: { posicaoM: new Vetor3(0, 2, 0) } });
    const bancada = new Objeto({ id: 'bancada-direcao', massaBaseKg: 2_000, dimensoesM: new Vetor3(6, 4, 1), resistenciaColisaoJ: 1_000_000, resistenciaCalorK: 1_000, estadoInicial: { posicaoM: new Vetor3(0, 2, 0) } });
    const motor = new Objeto({ id: 'motor-direcao', massaBaseKg: 150, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 1_000_000, resistenciaCalorK: 1_000, estadoInicial: { posicaoM: new Vetor3(0, 2, 0) } });
    const tanque = new Objeto({ id: 'tanque-direcao', massaBaseKg: 400, dimensoesM: new Vetor3(1, 2, 1), resistenciaColisaoJ: 1_000_000, resistenciaCalorK: 1_000, estadoInicial: { posicaoM: new Vetor3(2, 2, 0) } });
    const fixadores = [
      new FixadorEstrutural({ id: 'fixador-direcao-fundacao', objetoA: fundacao, objetoB: bancada, resistenciaTracaoN: 1_000_000, obterEsforcoSolicitadoN: () => 5_000 }),
      new FixadorEstrutural({ id: 'fixador-direcao-motor', objetoA: bancada, objetoB: motor, resistenciaTracaoN: 100_000, obterEsforcoSolicitadoN: () => 5_000 }),
      new FixadorEstrutural({ id: 'fixador-direcao-tanque', objetoA: bancada, objetoB: tanque, resistenciaTracaoN: 100_000, obterEsforcoSolicitadoN: () => 0 }),
    ];
    mundo.registrarSuperficie(solo); for (const objeto of [fundacao, bancada, motor, tanque]) mundo.registrarObjeto(objeto); for (const fixador of fixadores) mundo.registrarFixador(fixador);
    const massaTotal = fundacao.massaKg + bancada.massaKg + motor.massaKg + tanque.massaKg;
    const centroDeMassaInicialX = (tanque.massaKg * tanque.getEstadoFisico().posicaoM.x) / massaTotal;
    let menorXDaBancadaM = 0;
    for (let passo = 0; passo < 480; passo += 1) {
      mundo.aplicarForca(motor, new Vetor3(5_000, 0, 0));
      mundo.avancar(1 / 240);
      menorXDaBancadaM = Math.min(menorXDaBancadaM, bancada.getEstadoFisico().posicaoM.x);
    }
    const xAntesDeDesligarM = bancada.getEstadoFisico().posicaoM.x;
    for (let passo = 0; passo < 480; passo += 1) {
      mundo.avancar(1 / 240);
      menorXDaBancadaM = Math.min(menorXDaBancadaM, bancada.getEstadoFisico().posicaoM.x);
    }
    const centroDeMassaX = (fundacao.getEstadoFisico().posicaoM.x * fundacao.massaKg + bancada.getEstadoFisico().posicaoM.x * bancada.massaKg + motor.getEstadoFisico().posicaoM.x * motor.massaKg + tanque.getEstadoFisico().posicaoM.x * tanque.massaKg) / massaTotal;
    expect(centroDeMassaX).toBeGreaterThan(centroDeMassaInicialX);
    expect(bancada.getEstadoFisico().posicaoM.x).toBeGreaterThanOrEqual(0);
    // A fundação permanece praticamente estacionária; tolerância submilimétrica
    // cobre a correção numérica de contatos sem mascarar recuo observável.
    expect(menorXDaBancadaM).toBeGreaterThanOrEqual(-1e-3);
    expect(bancada.getEstadoFisico().posicaoM.x).toBeGreaterThanOrEqual(xAntesDeDesligarM - 1e-3);
  });

  it('gera rotação quando uma força é aplicada fora do centro de massa', () => {
    const mundo = new MundoFisico(1);
    const objeto = criarObjeto();
    mundo.registrarObjeto(objeto);
    mundo.aplicarForca(objeto, new Vetor3(0, 10, 0), new Vetor3(1, 0, 0));

    mundo.avancar(1);

    expect(objeto.getEstadoFisico().velocidadeAngularRadps.z).toBeCloseTo(7.5, 10);
    expect(objeto.getEstadoFisico().orientacaoRad.z).toBeCloseTo(7.5, 10);
  });

  it('subdivide dt grande e mantém o mesmo resultado para a mesma sequência', () => {
    const simular = () => {
      const mundo = new MundoFisico(0.1);
      const objeto = criarObjeto();
      mundo.registrarObjeto(objeto);
      mundo.aplicarForca(objeto, new Vetor3(20, 19.6133, 0));
      mundo.avancar(1);
      return objeto.getEstadoFisico();
    };

    expect(simular()).toEqual(simular());
  });

  it('registra dano apenas quando o impacto excede a resistência', () => {
    const objeto = criarObjeto();
    objeto.aplicarDanoPorImpacto(100);
    expect(objeto.integridadeEstrutural).toBe(1);

    objeto.aplicarDanoPorImpacto(150);
    expect(objeto.integridadeEstrutural).toBeCloseTo(0.5, 10);
  });

  it('resolve colisão frontal com dissipação material e separa os objetos sem encerrar a simulação', () => {
    const mundo = new MundoFisico(1);
    const objetoA = new Objeto({
      id: 'colisor-a', massaBaseKg: 2, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 1_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(-0.2, 0, 0), velocidadeMps: new Vetor3(10, 0, 0) },
    });
    const objetoB = new Objeto({
      id: 'colisor-b', massaBaseKg: 2, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 1_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0.2, 0, 0), velocidadeMps: new Vetor3(-10, 0, 0) },
    });
    mundo.registrarObjeto(objetoA);
    mundo.registrarObjeto(objetoB);

    mundo.avancar(0.015);

    // Cada material dissipa 15%; a dissipação combinada é 27,75%.
    expect(objetoA.getEstadoFisico().velocidadeMps.x).toBeCloseTo(-7.225, 10);
    expect(objetoB.getEstadoFisico().velocidadeMps.x).toBeCloseTo(7.225, 10);
    expect(objetoA.getEstadoFisico().posicaoM.x).toBeLessThanOrEqual(-0.5);
    expect(objetoB.getEstadoFisico().posicaoM.x).toBeGreaterThanOrEqual(0.5);
    expect(mundo.tempoS).toBeCloseTo(0.015, 10);
  });

  it('aplica dano de colisão sem interromper a evolução dos objetos', () => {
    const mundo = new MundoFisico(1);
    const objetoA = new Objeto({
      id: 'fragil-a', massaBaseKg: 2, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 100, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(-0.2, 0, 0), velocidadeMps: new Vetor3(10, 0, 0) },
    });
    const objetoB = new Objeto({
      id: 'fragil-b', massaBaseKg: 2, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 100, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0.2, 0, 0), velocidadeMps: new Vetor3(-10, 0, 0) },
    });
    mundo.registrarObjeto(objetoA);
    mundo.registrarObjeto(objetoB);

    mundo.avancar(0.015);

    expect(objetoA.integridadeEstrutural).toBe(0);
    expect(objetoB.integridadeEstrutural).toBe(0);
    expect(mundo.tempoS).toBeCloseTo(0.015, 10);
  });

  it.each([
    [100, 0],
    [150, 2 / 3],
    [200, 1],
    [400, 1],
  ])('aplica integridade esperada para resistência de colisão de %d J', (resistenciaJ, integridadeEsperada) => {
    const mundo = new MundoFisico(1);
    const criarColisor = (id: string, x: number, velocidadeX: number) => new Objeto({
      id, massaBaseKg: 2, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: resistenciaJ, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(x, 0, 0), velocidadeMps: new Vetor3(10 * velocidadeX, 0, 0) },
    });
    const objetoA = criarColisor(`resistente-a-${resistenciaJ}`, -0.2, 1);
    const objetoB = criarColisor(`resistente-b-${resistenciaJ}`, 0.2, -1);
    mundo.registrarObjeto(objetoA);
    mundo.registrarObjeto(objetoB);

    mundo.avancar(0.015);

    expect(objetoA.integridadeEstrutural).toBeCloseTo(integridadeEsperada, 10);
    expect(objetoB.integridadeEstrutural).toBeCloseTo(integridadeEsperada, 10);
    expect(mundo.tempoS).toBeCloseTo(0.015, 10);
  });

  it('gera torque em colisão fora do centro de massa de retângulos com base tripla', () => {
    const mundo = new MundoFisico(1);
    const objetoA = new Objeto({
      id: 'retangulo-a', massaBaseKg: 10, dimensoesM: new Vetor3(3, 1, 1),
      resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(-1.2, 0.05, 0), velocidadeMps: new Vetor3(10, 0, 0) },
    });
    const objetoB = new Objeto({
      id: 'retangulo-b', massaBaseKg: 10, dimensoesM: new Vetor3(3, 1, 1),
      resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(1.2, 0, 0), velocidadeMps: new Vetor3(-10, 0, 0) },
    });
    mundo.registrarObjeto(objetoA);
    mundo.registrarObjeto(objetoB);

    mundo.avancar(0.015);

    expect(Math.abs(objetoA.getEstadoFisico().velocidadeAngularRadps.z)).toBeGreaterThan(0.01);
    expect(Math.abs(objetoB.getEstadoFisico().velocidadeAngularRadps.z)).toBeGreaterThan(0.01);
    expect(objetoA.getEstadoFisico().velocidadeAngularRadps.z).toBeLessThan(0);
    expect(objetoB.getEstadoFisico().velocidadeAngularRadps.z).toBeLessThan(0);
  });

  it('devolve impulso ao quadrado e transfere energia para rotação no impacto fora do centro', () => {
    const simularImpacto = (alturaDoQuadradoM: number, maxDtS = 1 / 240) => {
      const mundo = new MundoFisico(maxDtS);
      const retangulo = new Objeto({
        id: `retangulo-${alturaDoQuadradoM}`, massaBaseKg: 10, dimensoesM: new Vetor3(1, 10, 1),
        resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
        estadoInicial: { posicaoM: new Vetor3(0, 5, 0) },
      });
      const quadrado = new Objeto({
        id: `quadrado-${alturaDoQuadradoM}`, massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1),
        resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
        estadoInicial: { posicaoM: new Vetor3(-0.2, alturaDoQuadradoM, 0), velocidadeMps: new Vetor3(10, 0, 0) },
      });
      mundo.registrarObjeto(retangulo);
      mundo.registrarObjeto(quadrado);
      mundo.avancar(0.015);
      return {
        giroDoRetanguloRadps: retangulo.getEstadoFisico().velocidadeAngularRadps.z,
        velocidadeDoQuadradoMps: quadrado.getEstadoFisico().velocidadeMps.x,
      };
    };

    const impactoForaDoCentro = simularImpacto(2);
    const impactoNoCentro = simularImpacto(5);
    const impactoForaDoCentroEmPassoUnico = simularImpacto(2, 0.015);
    expect(Math.abs(impactoForaDoCentro.giroDoRetanguloRadps)).toBeGreaterThan(0.01);
    expect(Math.abs(impactoNoCentro.giroDoRetanguloRadps)).toBeLessThan(0.000_001);
    expect(impactoForaDoCentro.velocidadeDoQuadradoMps).toBeLessThan(0);
    expect(impactoNoCentro.velocidadeDoQuadradoMps).toBeLessThan(0);
    expect(impactoForaDoCentroEmPassoUnico.velocidadeDoQuadradoMps).toBeLessThan(0);
  });

  it.each([10, 100, 10_000])(
    'reproduz queda livre em vácuo de %d m dentro da tolerância numérica',
    (alturaM) => {
      const resultado = simularQuedaLivreAteSolo(alturaM);
      const gravidade = Math.abs(MundoFisico.gravidadeTerrestreMps2.y);
      const tempoEsperadoS = Math.sqrt((2 * alturaM) / gravidade);
      const velocidadeEsperadaMps = Math.sqrt(2 * gravidade * alturaM);

      expect(resultado.tempoS).toBeCloseTo(tempoEsperadoS, 2);
      expect(resultado.velocidadeImpactoMps).toBeCloseTo(velocidadeEsperadaMps, 1);
    },
  );

  it('faz cubo rotacionado de 46° tocar o solo pela quina mais baixa', () => {
    const mundo = new MundoFisico(1 / 240);
    const solo = new SuperficiePlano('solo-cubo-rotacionado', 'concreto', 0, 100_000);
    const cubo = new Objeto({
      id: 'cubo-46-graus', massaBaseKg: 10, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0, 10, 0), orientacaoRad: new Vetor3(0, 0, 46 * Math.PI / 180) },
    });
    mundo.registrarSuperficie(solo);
    mundo.registrarObjeto(cubo);

    for (let passo = 0; passo < 1_000 && cubo.getEstadoFisico().velocidadeMps.y <= 0; passo += 1) mundo.avancar(1 / 240);

    expect(cubo.getEstadoFisico().velocidadeMps.y).toBeGreaterThan(0);
    const alturaDaQuinaMaisBaixaM = 0.5 * (Math.sin(46 * Math.PI / 180) + Math.cos(46 * Math.PI / 180));
    expect(cubo.getEstadoFisico().posicaoM.y).toBeGreaterThanOrEqual(alturaDaQuinaMaisBaixaM - 1e-9);
  });

  it('mantém trajetória de chegada a 45° quando velocidade horizontal e vertical têm mesmo módulo', () => {
    const mundo = new MundoFisico(1 / 240);
    const alturaDeContatoM = 0.5;
    const velocidadeHorizontalMps = Math.sqrt(2 * Math.abs(MundoFisico.gravidadeTerrestreMps2.y) * (10 - alturaDeContatoM));
    const cubo = new Objeto({
      id: 'cubo-trajetoria-45', massaBaseKg: 10, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0, 10, 0), velocidadeMps: new Vetor3(velocidadeHorizontalMps, 0, 0) },
    });
    mundo.registrarObjeto(cubo);

    while (cubo.getEstadoFisico().posicaoM.y > alturaDeContatoM) mundo.avancar(1 / 240);

    const velocidade = cubo.getEstadoFisico().velocidadeMps;
    const anguloComOSoloRad = Math.atan2(Math.abs(velocidade.y), Math.abs(velocidade.x));
    expect(anguloComOSoloRad).toBeCloseTo(Math.PI / 4, 2);
  });

  it('faz objeto de maior área frontal cair mais devagar com a mesma massa', () => {
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
    const criarObjetoComArea = (id: string, areaFrontalM2: number) => new Objeto({
      id, massaBaseKg: 10, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000, areaFrontalM2,
      estadoInicial: { posicaoM: new Vetor3(0, 100, 0) },
    });
    const areaGrande = criarObjetoComArea('area-100', 100);
    const areaPequena = criarObjetoComArea('area-1', 1);
    mundo.registrarObjeto(areaGrande);
    mundo.registrarObjeto(areaPequena);

    mundo.avancar(5);

    expect(areaGrande.getEstadoFisico().posicaoM.y).toBeGreaterThan(areaPequena.getEstadoFisico().posicaoM.y);
    expect(Math.abs(areaGrande.getEstadoFisico().velocidadeMps.y)).toBeLessThan(Math.abs(areaPequena.getEstadoFisico().velocidadeMps.y));
  });

  it('resolve impacto contra o solo pelo mesmo modelo de colisão dos objetos', () => {
    const mundo = new MundoFisico(1 / 240);
    const solo = new SuperficiePlano('solo-terrestre', 'concreto', 0, 100_000);
    const objeto = new Objeto({
      id: 'objeto-em-queda', massaBaseKg: 10, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0, 10, 0) },
    });
    mundo.registrarSuperficie(solo);
    mundo.registrarObjeto(objeto);

    for (let passo = 0; passo < 500 && objeto.getEstadoFisico().velocidadeMps.y <= 0; passo += 1) {
      mundo.avancar(1 / 240);
    }

    expect(objeto.getEstadoFisico().velocidadeMps.y).toBeGreaterThan(0);
    expect(objeto.getEstadoFisico().posicaoM.y).toBeGreaterThanOrEqual(0.5);
    expect(solo.integridadeEstrutural).toBe(1);
  });

  it('usa a quina mais baixa da geometria rotacionada no contato com o solo', () => {
    const mundo = new MundoFisico(1 / 240);
    const solo = new SuperficiePlano('solo-quina-orientada', 'concreto', 0, 100_000);
    const retangulo = new Objeto({
      id: 'retangulo-inclinado', massaBaseKg: 10, dimensoesM: new Vetor3(1, 10, 1),
      resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0, 4.5, 0), orientacaoRad: new Vetor3(0, 0, 0.5) },
    });
    mundo.registrarSuperficie(solo);
    mundo.registrarObjeto(retangulo);

    mundo.avancar(1 / 240);

    const estado = retangulo.getEstadoFisico();
    const menorAlturaM = Math.min(...[-0.5, 0.5].flatMap((xLocal) => [-5, 5].map((yLocal) => (
      estado.posicaoM.y + (xLocal * Math.sin(estado.orientacaoRad.z)) + (yLocal * Math.cos(estado.orientacaoRad.z))
      ))));
    expect(menorAlturaM).toBeGreaterThanOrEqual(-1e-9);
  });

  it('reduz deslizamento no solo por atrito de contato', () => {
    const mundo = new MundoFisico(1 / 240);
    const solo = new SuperficiePlano('solo-com-atrito', 'concreto', 0, 100_000, 0.15, 0.65);
    const objeto = new Objeto({
      id: 'objeto-deslizante', massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000, coeficienteAtrito: 0.65,
      estadoInicial: { posicaoM: new Vetor3(0, 0.5, 0), velocidadeMps: new Vetor3(10, 0, 0) },
    });
    mundo.registrarSuperficie(solo);
    mundo.registrarObjeto(objeto);

    mundo.avancar(5);

    expect(Math.abs(objeto.getEstadoFisico().velocidadeMps.x)).toBeLessThan(10);
    expect(objeto.getEstadoFisico().posicaoM.y).toBeGreaterThanOrEqual(0.5);
  });

  it('mostra objeto de 1 kg caindo 50 m e colidindo com solo de concreto', () => {
    const mundo = new MundoFisico(1 / 240);
    const solo = new SuperficiePlano('solo-concreto-50m', 'concreto', 0, 100_000);
    const objeto = new Objeto({
      id: 'objeto-1kg-50m', massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0, 50, 0) },
    });
    mundo.registrarSuperficie(solo);
    mundo.registrarObjeto(objeto);

    for (let passo = 0; passo < 1_000 && objeto.getEstadoFisico().velocidadeMps.y <= 0; passo += 1) {
      mundo.avancar(1 / 240);
    }

    const velocidadeChegadaEsperadaMps = Math.sqrt(2 * Math.abs(MundoFisico.gravidadeTerrestreMps2.y) * 50);
    const velocidadeQuiqueEsperadaMps = velocidadeChegadaEsperadaMps * 0.7225;
    expect(Math.abs(objeto.getEstadoFisico().velocidadeMps.y - velocidadeQuiqueEsperadaMps)).toBeLessThan(0.2);
    expect(objeto.getEstadoFisico().posicaoM.y).toBeGreaterThanOrEqual(0.5);
    expect(objeto.integridadeEstrutural).toBe(1);
    expect(solo.integridadeEstrutural).toBe(1);
  });

  it('dissipa os quiques até o objeto de 1 kg entrar em repouso no solo', () => {
    const mundo = new MundoFisico(1 / 240);
    const solo = new SuperficiePlano('solo-dissipacao', 'concreto', 0, 100_000);
    const objeto = new Objeto({
      id: 'objeto-dissipacao', massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0, 50, 0) },
    });
    mundo.registrarSuperficie(solo);
    mundo.registrarObjeto(objeto);

    let repousou = false;
    for (let passo = 0; passo < 30_000; passo += 1) {
      mundo.avancar(1 / 240);
      const estado = objeto.getEstadoFisico();
      repousou = estado.posicaoM.y <= 0.51 && Math.abs(estado.velocidadeMps.y) <= 0.05;
      if (repousou) break;
    }

    expect(repousou).toBe(true);
  });

  it('mantém dois quadrados de 1 kg inicialmente empilhados ao cair 10 m', () => {
    const mundo = new MundoFisico(1 / 240);
    const solo = new SuperficiePlano('solo-quadrados-empilhados', 'concreto', 0, 100_000);
    const inferior = new Objeto({
      id: 'quadrado-inferior-queda-conjunta', massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0, 10.5, 0) },
    });
    const superior = new Objeto({
      id: 'quadrado-superior-queda-conjunta', massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0, 11.5, 0) },
    });
    mundo.registrarSuperficie(solo);
    mundo.registrarObjeto(inferior);
    mundo.registrarObjeto(superior);

    let repousaram = false;
    for (let passo = 0; passo < 30_000; passo += 1) {
      mundo.avancar(1 / 240);
      const estadoInferior = inferior.getEstadoFisico();
      const estadoSuperior = superior.getEstadoFisico();
      repousaram = estadoInferior.velocidadeMps.magnitude <= 0.05
        && estadoSuperior.velocidadeMps.magnitude <= 0.05
        && estadoInferior.posicaoM.y >= 0.5 - 1e-8
        && estadoSuperior.posicaoM.y >= 1.5 - 1e-8;
      if (repousaram) break;
    }

    expect(repousaram).toBe(true);
    expect(superior.getEstadoFisico().posicaoM.y - inferior.getEstadoFisico().posicaoM.y).toBeGreaterThanOrEqual(1 - 1e-8);
  });

  it('mantém quadrado superior de 0,5 kg apoiado sobre quadrado inferior de 1 kg após queda conjunta de 10 m', () => {
    const mundo = new MundoFisico(1 / 240);
    const solo = new SuperficiePlano('solo-quadrados-massas-diferentes', 'concreto', 0, 100_000);
    const inferior = new Objeto({
      id: 'quadrado-inferior-1kg', massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0, 10.5, 0) },
    });
    const superior = new Objeto({
      id: 'quadrado-superior-05kg', massaBaseKg: 0.5, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0, 11.5, 0) },
    });
    mundo.registrarSuperficie(solo);
    mundo.registrarObjeto(inferior);
    mundo.registrarObjeto(superior);

    let repousaram = false;
    for (let passo = 0; passo < 30_000; passo += 1) {
      mundo.avancar(1 / 240);
      const estadoInferior = inferior.getEstadoFisico();
      const estadoSuperior = superior.getEstadoFisico();
      repousaram = estadoInferior.velocidadeMps.magnitude <= 0.05
        && estadoSuperior.velocidadeMps.magnitude <= 0.05
        && estadoInferior.posicaoM.y >= 0.5 - 1e-8
        && estadoSuperior.posicaoM.y >= 1.5 - 1e-8;
      if (repousaram) break;
    }

    expect(repousaram).toBe(true);
    expect(inferior.massaKg).toBe(1);
    expect(superior.massaKg).toBe(0.5);
    expect(superior.getEstadoFisico().posicaoM.y - inferior.getEstadoFisico().posicaoM.y).toBeGreaterThanOrEqual(1 - 1e-8);
  });

  it('resolve quadrado de 1 kg caindo 10 m sobre outro igual em repouso no solo', () => {
    const mundo = new MundoFisico(1 / 240);
    const solo = new SuperficiePlano('solo-quadrado-sobre-quadrado', 'concreto', 0, 100_000);
    const apoiado = new Objeto({
      id: 'quadrado-apoiado', massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0, 0.5, 0) },
    });
    const emQueda = new Objeto({
      id: 'quadrado-queda-sobre-apoiado', massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0, 10.5, 0) },
    });
    mundo.registrarSuperficie(solo);
    mundo.registrarObjeto(apoiado);
    mundo.registrarObjeto(emQueda);

    let repousaram = false;
    for (let passo = 0; passo < 30_000; passo += 1) {
      mundo.avancar(1 / 240);
      const estadoApoiado = apoiado.getEstadoFisico();
      const estadoEmQueda = emQueda.getEstadoFisico();
      repousaram = estadoApoiado.velocidadeMps.magnitude <= 0.05
        && estadoEmQueda.velocidadeMps.magnitude <= 0.05
        && estadoApoiado.posicaoM.y >= 0.5 - 1e-8
        && estadoEmQueda.posicaoM.y >= 1.5 - 1e-8;
      if (repousaram) break;
    }

    expect(repousaram).toBe(true);
    expect(emQueda.getEstadoFisico().posicaoM.y - apoiado.getEstadoFisico().posicaoM.y).toBeGreaterThanOrEqual(1 - 1e-8);
  });

  it('resolve quadrado leve de 0,5 kg caindo 10 m sobre quadrado de 1 kg em repouso no solo', () => {
    const mundo = new MundoFisico(1 / 240);
    const solo = new SuperficiePlano('solo-quadrado-leve-sobre-pesado', 'concreto', 0, 100_000);
    const pesado = new Objeto({
      id: 'quadrado-pesado-apoiado', massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0, 0.5, 0) },
    });
    const leve = new Objeto({
      id: 'quadrado-leve-em-queda', massaBaseKg: 0.5, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0, 10.5, 0) },
    });
    mundo.registrarSuperficie(solo);
    mundo.registrarObjeto(pesado);
    mundo.registrarObjeto(leve);

    let repousaram = false;
    for (let passo = 0; passo < 30_000; passo += 1) {
      mundo.avancar(1 / 240);
      const estadoPesado = pesado.getEstadoFisico();
      const estadoLeve = leve.getEstadoFisico();
      repousaram = estadoPesado.velocidadeMps.magnitude <= 0.05
        && estadoLeve.velocidadeMps.magnitude <= 0.05
        && estadoPesado.posicaoM.y >= 0.5 - 1e-8
        && estadoLeve.posicaoM.y >= 1.5 - 1e-8;
      if (repousaram) break;
    }

    expect(repousaram).toBe(true);
    expect(pesado.massaKg).toBe(1);
    expect(leve.massaKg).toBe(0.5);
    expect(leve.getEstadoFisico().posicaoM.y - pesado.getEstadoFisico().posicaoM.y).toBeGreaterThanOrEqual(1 - 1e-8);
  });

  it('mantém resposta contínua quando a massa que cai muda de 1 kg para 0,99 kg', () => {
    const simular = (massaSuperiorKg: number): number => {
      const mundo = new MundoFisico(1 / 240);
      const solo = new SuperficiePlano(`solo-transicao-${massaSuperiorKg}`, 'concreto', 0, 100_000);
      const inferior = new Objeto({
        id: `inferior-transicao-${massaSuperiorKg}`, massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1),
        resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
        estadoInicial: { posicaoM: new Vetor3(0, 0.5, 0) },
      });
      const superior = new Objeto({
        id: `superior-transicao-${massaSuperiorKg}`, massaBaseKg: massaSuperiorKg, dimensoesM: new Vetor3(1, 1, 1),
        resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
        estadoInicial: { posicaoM: new Vetor3(0, 10.5, 0) },
      });
      mundo.registrarSuperficie(solo);
      mundo.registrarObjeto(inferior);
      mundo.registrarObjeto(superior);
      let picoVerticalParaCimaMps = 0;
      for (let passo = 0; passo < 4_000; passo += 1) {
        mundo.avancar(1 / 240);
        picoVerticalParaCimaMps = Math.max(picoVerticalParaCimaMps, inferior.getEstadoFisico().velocidadeMps.y);
      }
      return picoVerticalParaCimaMps;
    };

    const picoCom1Kg = simular(1);
    const picoCom099Kg = simular(0.99);
    expect(Math.abs(picoCom099Kg - picoCom1Kg)).toBeLessThan(0.2);
  });

  it('transfere impacto para o segundo elemento de uma pilha de dez quadrados sem vínculos estruturais', () => {
    const mundo = new MundoFisico(1 / 240);
    const solo = new SuperficiePlano('solo-pilha-dez', 'concreto', 0, 100_000);
    const xDaPilhaM = 3;
    const pilha = Array.from({ length: 10 }, (_, indice) => new Objeto({
      id: `pilha-${indice + 1}`,
      massaBaseKg: 1,
      dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000,
      resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(xDaPilhaM, 0.5 + indice, 0) },
    }));
    const projetil = new Objeto({
      id: 'projetil-pilha',
      massaBaseKg: 2,
      dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000,
      resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(-1, 1.5, 0), velocidadeMps: new Vetor3(10, 0, 0) },
    });
    mundo.registrarSuperficie(solo);
    for (const quadrado of pilha) mundo.registrarObjeto(quadrado);
    mundo.registrarObjeto(projetil);

    let picoDeslocamentoDoSegundoM = 0;
    let picoVelocidadeDoSegundoMps = 0;
    for (let passo = 0; passo < 480; passo += 1) {
      mundo.avancar(1 / 240);
      const estadoSegundo = pilha[1].getEstadoFisico();
      picoDeslocamentoDoSegundoM = Math.max(picoDeslocamentoDoSegundoM, Math.abs(estadoSegundo.posicaoM.x - xDaPilhaM));
      picoVelocidadeDoSegundoMps = Math.max(picoVelocidadeDoSegundoMps, Math.abs(estadoSegundo.velocidadeMps.x));
    }

    expect(pilha).toHaveLength(10);
    expect(pilha.every((quadrado) => quadrado.massaKg === 1)).toBe(true);
    expect(projetil.massaKg).toBe(2);
    expect(picoDeslocamentoDoSegundoM).toBeGreaterThan(0.05);
    expect(picoVelocidadeDoSegundoMps).toBeGreaterThan(0.05);
  });

  it('apoia a face inferior de uma parede retangular de 4000 kg no solo', () => {
    const mundo = new MundoFisico(1 / 240);
    const solo = new SuperficiePlano('pista-parede-4000kg', 'concreto', 0, 1_000_000);
    const parede = new Objeto({
      id: 'parede-retangular-4000kg', massaBaseKg: 4_000, dimensoesM: new Vetor3(1, 3, 3),
      resistenciaColisaoJ: 500_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0, 5, 0) },
    });
    mundo.registrarSuperficie(solo);
    mundo.registrarObjeto(parede);

    let repousou = false;
    for (let passo = 0; passo < 30_000; passo += 1) {
      mundo.avancar(1 / 240);
      const estado = parede.getEstadoFisico();
      repousou = Math.abs(estado.posicaoM.y - 1.5) <= 0.01
        && estado.velocidadeMps.magnitude <= 0.05
        && estado.velocidadeAngularRadps.magnitude <= 0.05;
      if (repousou) break;
    }

    expect(repousou).toBe(true);
    expect(parede.getEstadoFisico().posicaoM.y).toBeGreaterThanOrEqual(1.5 - 1e-9);
  });

  it('colide veículo com a face de base de uma parede já tombada', () => {
    const mundo = new MundoFisico(1 / 240);
    const paredeTombada = new Objeto({
      id: 'parede-tombada', massaBaseKg: 4_000, dimensoesM: new Vetor3(1, 6, 2),
      resistenciaColisaoJ: 500_000, resistenciaCalorK: 1_000,
      // A base local (y negativo) está na extremidade direita após a rotação.
      estadoInicial: { posicaoM: new Vetor3(0, 1, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
    });
    const veiculo = new Objeto({
      id: 'veiculo-contra-base', massaBaseKg: 1_500, dimensoesM: new Vetor3(1, 1, 2),
      resistenciaColisaoJ: 200_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(3.35, 1, 0), velocidadeMps: new Vetor3(-5, 0, 0) },
    });
    mundo.registrarObjeto(paredeTombada);
    mundo.registrarObjeto(veiculo);
    mundo.avancar(1 / 60);

    expect(veiculo.getEstadoFisico().velocidadeMps.x).toBeGreaterThan(0);
    expect(paredeTombada.getEstadoFisico().velocidadeMps.x).toBeLessThan(0);
  });

  it('danifica objeto de 100 kg que cai 50 m contra solo de concreto', () => {
    const mundo = new MundoFisico(1 / 240);
    const solo = new SuperficiePlano('solo-concreto-50m-100kg', 'concreto', 0, 100_000);
    const objeto = new Objeto({
      id: 'objeto-100kg-50m', massaBaseKg: 100, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0, 50, 0) },
    });
    mundo.registrarSuperficie(solo);
    mundo.registrarObjeto(objeto);

    for (let passo = 0; passo < 1_000 && objeto.getEstadoFisico().velocidadeMps.y <= 0; passo += 1) {
      mundo.avancar(1 / 240);
    }

    expect(objeto.getEstadoFisico().velocidadeMps.y).toBeGreaterThan(0);
    expect(objeto.getEstadoFisico().posicaoM.y).toBeGreaterThanOrEqual(0.5);
    expect(objeto.integridadeEstrutural).toBe(0);
    expect(solo.integridadeEstrutural).toBe(1);
  });
});
