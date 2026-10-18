import type { EstadoFisico } from '../objetos/base/Objeto';
import { Objeto } from '../objetos/base/Objeto';
import type { ForcaAplicada } from '../tipos/ForcaAplicada';
import { Vetor3 } from '../Vetor3';

/** Estado de uma ilha de corpos unidos por vínculos rígidos no plano XY. */
export class ConjuntoEstruturalRigido {
  private readonly referenciasLocaisM = new Map<Objeto, Vetor3>();
  private readonly orientacoesRelativasRad = new Map<Objeto, Vetor3>();
  private readonly estadosDeMontagem = new Map<Objeto, EstadoFisico>();
  private anguloDoConjuntoRad: number;
  private massaDasReferenciasKg: number;
  private centroCalculado?: { valor: Vetor3; posicoes: readonly Vetor3[]; massas: readonly number[] };

  /** Captura geometria relativa e estados de montagem de membros conectados; exige lista não vazia com massas positivas, usa orientação Z do primeiro membro. @contract f-d3848f1d1b9d7918 @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly objetos: readonly Objeto[]) {
    const objetoDeReferencia = objetos[0];
    const anguloInicial = objetoDeReferencia.getEstadoFisico().orientacaoRad.z;
    this.anguloDoConjuntoRad = anguloInicial;
    const centroMassa = this.obterCentroDeMassaAtual();
    for (const objeto of objetos) {
      const estado = objeto.getEstadoFisico();
      this.estadosDeMontagem.set(objeto, estado);
      this.referenciasLocaisM.set(objeto, this.rotacionarNoPlano(estado.posicaoM.subtrair(centroMassa), -anguloInicial));
      this.orientacoesRelativasRad.set(objeto, estado.orientacaoRad.subtrair(new Vetor3(0, 0, anguloInicial)));
    }
    this.massaDasReferenciasKg = this.massaTotalKg;
  }

  /**
   * Conserva momento linear e angular de todos os membros simultaneamente.
   * Momento intrínseco usa v−Vg, evitando contaminação pela translação orbital
   * quando o primeiro momento de massa residual não é zero em Float64.
   * Avançar o ângulo só ocorre uma vez por passo; após colisões, a projeção
   * reaplica a rigidez sem introduzir avanço angular duplicado.
   * @contract f-dd4593ec27d92adb
   */
  public sincronizar(dtS: number, avancarOrientacao: boolean): void {
    this.atualizarReferenciasLocaisPelaMassaAtual();
    const centroMassa = this.obterCentroDeMassaAtual();
    const massaTotalKg = this.objetos.reduce((soma, objeto) => soma + objeto.massaKg, 0);
    const velocidadeDoCentroMps = this.objetos.reduce(
      (soma, objeto) => soma.adicionar(objeto.getEstadoFisico().velocidadeMps.multiplicar(objeto.massaKg / massaTotalKg)),
      Vetor3.zero,
    );
    const inerciaZ = this.obterInerciaCompostaZ();
    const centroVel = this.obterVelocidadeDoCentroAtual();
    const momentoAngularZ = this.objetos.reduce((soma, objeto) => {
      const estado = objeto.getEstadoFisico();
      const bx = estado.posicaoM.x - centroMassa.x, by = estado.posicaoM.y - centroMassa.y;
      return soma + (bx * ((estado.velocidadeMps.y - centroVel.y) * objeto.massaKg) - by * ((estado.velocidadeMps.x - centroVel.x) * objeto.massaKg))
        + objeto.getMomentoInerciaKgM2().z * estado.velocidadeAngularRadps.z;
    }, 0);
    const velocidadeAngularZ = momentoAngularZ / inerciaZ;
    if (avancarOrientacao) this.anguloDoConjuntoRad += velocidadeAngularZ * dtS;
    const velocidadeAngular = new Vetor3(0, 0, velocidadeAngularZ);

    for (const objeto of this.objetos) {
      const estadoAnterior = objeto.getEstadoFisico();
      const referenciaLocal = this.referenciasLocaisM.get(objeto)!;
      const braco = this.rotacionarNoPlano(referenciaLocal, this.anguloDoConjuntoRad);
      const velocidadeTangencial = new Vetor3(-velocidadeAngularZ * braco.y, velocidadeAngularZ * braco.x, 0);
      const orientacaoRelativa = this.orientacoesRelativasRad.get(objeto)!;
      objeto.atualizarEstadoPeloCore({
        ...estadoAnterior,
        posicaoM: centroMassa.adicionar(braco),
        velocidadeMps: velocidadeDoCentroMps.adicionar(velocidadeTangencial),
        orientacaoRad: new Vetor3(orientacaoRelativa.x, orientacaoRelativa.y, orientacaoRelativa.z + this.anguloDoConjuntoRad),
        velocidadeAngularRadps: velocidadeAngular,
      });
    }
  }

  /** Verifica pertencimento por identidade de instância no conjunto rígido atual. @contract f-db72109b5862bb2c @reviewed M12-DOC: implementação lida. */
  public contem(objeto: Objeto): boolean { return this.objetos.includes(objeto); }

  /** Devolve a lista de membros tipada readonly; não cria cópias de corpos ou de estados físicos. @contract f-b144fcc6051f60bc @reviewed M12-DOC: implementação lida. */
  public get membros(): readonly Objeto[] { return this.objetos; }
  /** Consulta inércia planar composta kg·m², somando inércias próprias e termo de eixos paralelos. @contract f-a8f9f77cf3111cdd @reviewed M12-DOC: implementação lida. */
  public get momentoInerciaZKgM2(): number { return this.obterInerciaCompostaZ(); }

  /** Reação da fundação rígida: preserva a geometria montada da ilha inteira.
   * @contract f-21ad1a8b15c07bb6
   */
  public restringirAoSolo(): void {
    for (const objeto of this.objetos) objeto.atualizarEstadoPeloCore(this.estadosDeMontagem.get(objeto)!);
  }

  /** Junta fixa que ancora um membro sem desfazer a geometria do conjunto.
   * @contract f-3f9e81d50af0af7f
   */
  public restringirNoMembro(objetoAncorado: Objeto, estadoDeAncoragem: EstadoFisico): void {
    if (!this.contem(objetoAncorado)) throw new Error('Membro ancorado não pertence ao conjunto estrutural.');
    const orientacaoRelativaAncorada = this.orientacoesRelativasRad.get(objetoAncorado)!;
    this.anguloDoConjuntoRad = estadoDeAncoragem.orientacaoRad.z - orientacaoRelativaAncorada.z;
    const referenciaAncorada = this.referenciasLocaisM.get(objetoAncorado)!;
    const centroDeMassa = estadoDeAncoragem.posicaoM.subtrair(this.rotacionarNoPlano(referenciaAncorada, this.anguloDoConjuntoRad));
    for (const objeto of this.objetos) {
      const estado = objeto.getEstadoFisico();
      const referenciaLocal = this.referenciasLocaisM.get(objeto)!;
      const orientacaoRelativa = this.orientacoesRelativasRad.get(objeto)!;
      objeto.atualizarEstadoPeloCore({
        ...estado,
        posicaoM: centroDeMassa.adicionar(this.rotacionarNoPlano(referenciaLocal, this.anguloDoConjuntoRad)),
        velocidadeMps: Vetor3.zero,
        velocidadeAngularRadps: Vetor3.zero,
        orientacaoRad: new Vetor3(orientacaoRelativa.x, orientacaoRelativa.y, orientacaoRelativa.z + this.anguloDoConjuntoRad),
      });
    }
  }

  /** Soma massas instantâneas kg dos membros, incluindo consumíveis físicos atuais. @contract f-dc4b60a8630d67b8 @reviewed M12-DOC: implementação lida. */
  public get massaTotalKg(): number {
    return this.objetos.reduce((soma, objeto) => soma + objeto.massaKg, 0);
  }

  /** Massa dinâmica vista em um ponto e direção de contato do conjunto inteiro.
   * @contract f-b22a4e9a52edd60f
   */
  public obterMassaEfetivaNoContato(pontoContatoM: Vetor3, normal: Vetor3): number {
    const massaTotalKg = this.massaTotalKg;
    const braco = pontoContatoM.subtrair(this.obterCentroDeMassaAtual());
    const torqueUnitarioZ = braco.produtoVetorial(normal).z;
    return 1 / ((1 / massaTotalKg) + (torqueUnitarioZ ** 2 / this.obterInerciaCompostaZ()));
  }

  /** Calcula G pela média ponderada das posições por massas instantâneas; reutiliza somente cache exatamente compatível. Retorna posição m. Cache exige mesmas referências de posição e mesmas massas individuais, não apenas massa total. Atualiza memoização; preserva ordem de soma e não altera corpos. @contract f-a380dcc40ef24c82 @reviewed M12-DOC: implementação lida. */
  public obterCentroDeMassaAtual(): Vetor3 {
    const cache = this.centroCalculado;
    if (cache && this.objetos.every((o, i) => cache.posicoes[i] === o.getEstadoFisico().posicaoM && cache.massas[i] === o.massaKg)) return cache.valor;
    const massaTotalKg = this.massaTotalKg;
    let x = 0, y = 0, z = 0;
    for (const objeto of this.objetos) {
      const p = objeto.getEstadoFisico().posicaoM, peso = objeto.massaKg / massaTotalKg;
      x += p.x * peso; y += p.y * peso; z += p.z * peso;
    }
    const valor = new Vetor3(x, y, z);
    this.centroCalculado = { valor, posicoes: this.objetos.map(o => o.getEstadoFisico().posicaoM), massas: this.objetos.map(o => o.massaKg) };
    return valor;
  }

  /** Velocidade física do corpo rígido no ponto de contato informado.
   * @contract f-3b36d6e87005a46e
   */
  public obterVelocidadeNoPonto(pontoM: Vetor3): Vetor3 {
    const centroMassa = this.obterCentroDeMassaAtual();
    const velocidadeCentro = this.obterVelocidadeDoCentroAtual();
    const velocidadeAngular = new Vetor3(0, 0, this.obterVelocidadeAngularAtual(centroMassa));
    return velocidadeCentro.adicionar(velocidadeAngular.produtoVetorial(pontoM.subtrair(centroMassa)));
  }

  /** Aplica impulso diretamente à ilha, preservando a rigidez de seus membros.
   * @contract f-c6a983e8d4a7b876
   */
  public aplicarImpulsoNoPonto(impulsoNs: Vetor3, pontoM: Vetor3): void {
    const centroMassa = this.obterCentroDeMassaAtual();
    const velocidadeCentro = this.obterVelocidadeDoCentroAtual();
    const inerciaZ = this.obterInerciaCompostaZ();
    const velocidadeAngularZ = this.obterVelocidadeAngularAtual(centroMassa);
    const proximaVelocidadeCentro = velocidadeCentro.adicionar(impulsoNs.multiplicar(1 / this.massaTotalKg));
    const proximaVelocidadeAngularZ = velocidadeAngularZ + pontoM.subtrair(centroMassa).produtoVetorial(impulsoNs).z / inerciaZ;
    const proximaVelocidadeAngular = new Vetor3(0, 0, proximaVelocidadeAngularZ);
    for (const objeto of this.objetos) {
      const estado = objeto.getEstadoFisico();
      const bx = estado.posicaoM.x - centroMassa.x, by = estado.posicaoM.y - centroMassa.y, bz = estado.posicaoM.z - centroMassa.z;
      objeto.atualizarEstadoPeloCore({
        ...estado,
        // Expansão exata do produto vetorial: preserva a ordem e os zeros com sinal.
        velocidadeMps: new Vetor3(proximaVelocidadeCentro.x + (0 * bz - proximaVelocidadeAngularZ * by),
          proximaVelocidadeCentro.y + (proximaVelocidadeAngularZ * bx - 0 * bz), proximaVelocidadeCentro.z + (0 * by - 0 * bx)),
        velocidadeAngularRadps: proximaVelocidadeAngular,
      });
    }
  }

  /**
   * Kicks N·s sem mudança de pose/massa, em ordem declarada; duas passagens
   * calculam Vg e L intrínseco com v−Vg antes de cada impulso. Evita multiplicar
   * resíduos de CM pela velocidade orbital. Publica velocidades rígidas ao fim;
   * não altera KDK, dt ou forças. Regressão: conservação/Galileu RE-002B.
   * @contract f-ef8ab0fbe286de89
   */
  public aplicarImpulsosSequenciais(impulsos: readonly { impulsoNs: Vetor3; pontoM: Vetor3 }[]): void {
    if (impulsos.length === 0) return;
    const G = this.obterCentroDeMassaAtual(), massa = this.massaTotalKg, I = this.obterInerciaCompostaZ();
    const membros = this.objetos.map(o => {
      const e = o.getEstadoFisico();
      return { o, e, m: o.massaKg, peso: o.massaKg / massa, propria: o.getMomentoInerciaKgM2().z,
        bx: e.posicaoM.x - G.x, by: e.posicaoM.y - G.y, bz: e.posicaoM.z - G.z,
        vx: e.velocidadeMps.x, vy: e.velocidadeMps.y, vz: e.velocidadeMps.z, w: e.velocidadeAngularRadps.z };
    });
    for (const { impulsoNs: j, pontoM: p } of impulsos) {
      let vx = 0, vy = 0, vz = 0, L = 0;
      for (const b of membros) {
        vx += b.vx * b.peso; vy += b.vy * b.peso; vz += b.vz * b.peso;

      }
      for (const b of membros) L += b.bx * ((b.vy - vy) * b.m) - b.by * ((b.vx - vx) * b.m) + b.propria * b.w;
      vx += j.x * (1 / massa); vy += j.y * (1 / massa); vz += j.z * (1 / massa);
      const w = L / I + ((p.x - G.x) * j.y - (p.y - G.y) * j.x) / I;
      for (const b of membros) {
        b.vx = vx + (0 * b.bz - w * b.by); b.vy = vy + (w * b.bx - 0 * b.bz);
        b.vz = vz + (0 * b.by - 0 * b.bx); b.w = w;
        if (!Number.isFinite(b.vx) || !Number.isFinite(b.vy) || !Number.isFinite(b.vz) || !Number.isFinite(w)) throw new Error('Componentes de Vetor3 devem ser números finitos.');
      }
    }
    for (const b of membros) b.o.atualizarEstadoPeloCore({ ...b.e,
      velocidadeMps: new Vetor3(b.vx, b.vy, b.vz), velocidadeAngularRadps: new Vetor3(0, 0, b.w) });
  }

  /** Corrige penetração por translação da ilha inteira, nunca de um membro isolado.
   * @contract f-e851a177213a9963
   */
  public corrigirPenetracao(normal: Vetor3, penetracaoM: number): void {
    const deslocamentoM = normal.multiplicar(penetracaoM);
    for (const objeto of this.objetos) {
      const estado = objeto.getEstadoFisico();
      objeto.atualizarEstadoPeloCore({ ...estado, posicaoM: estado.posicaoM.adicionar(deslocamentoM) });
    }
  }

  /** Integra todas as forças externas como uma única resultante do corpo rígido.
   * @contract f-f4b59e6ece2fdff3
   */
  public integrar(forcas: readonly ForcaAplicada[], dtS: number): void {
    this.atualizarReferenciasLocaisPelaMassaAtual();
    const centroMassa = this.obterCentroDeMassaAtual();
    const resultanteN = forcas.reduce((soma, forca) => soma.adicionar(forca.forcaN), Vetor3.zero);
    const torqueZ = forcas.reduce((soma, forca) => soma + forca.pontoM.subtrair(centroMassa).produtoVetorial(forca.forcaN).z + (forca.torqueNm?.z ?? 0), 0);
    const velocidadeCentro = this.obterVelocidadeDoCentroAtual().adicionar(resultanteN.multiplicar(dtS / this.massaTotalKg));
    const proximoCentroMassa = centroMassa.adicionar(velocidadeCentro.multiplicar(dtS));
    const velocidadeAngularZ = this.obterVelocidadeAngularAtual(centroMassa) + torqueZ * dtS / this.obterInerciaCompostaZ();
    this.anguloDoConjuntoRad += velocidadeAngularZ * dtS;
    const velocidadeAngular = new Vetor3(0, 0, velocidadeAngularZ);
    for (const objeto of this.objetos) {
      const estadoAnterior = objeto.getEstadoFisico();
      const referenciaLocal = this.referenciasLocaisM.get(objeto)!;
      const braco = this.rotacionarNoPlano(referenciaLocal, this.anguloDoConjuntoRad);
      const orientacaoRelativa = this.orientacoesRelativasRad.get(objeto)!;
      objeto.atualizarEstadoPeloCore({
        ...estadoAnterior,
        posicaoM: proximoCentroMassa.adicionar(braco),
        velocidadeMps: velocidadeCentro.adicionar(velocidadeAngular.produtoVetorial(braco)),
        orientacaoRad: new Vetor3(orientacaoRelativa.x, orientacaoRelativa.y, orientacaoRelativa.z + this.anguloDoConjuntoRad),
        velocidadeAngularRadps: velocidadeAngular,
      });
    }
  }

  /** Calcula velocidade m/s de G pela média ponderada das velocidades dos membros; soma escalar preserva a ordem numérica. @contract f-d2c51cb872c6f449 @reviewed M12-DOC: implementação lida. */
  private obterVelocidadeDoCentroAtual(): Vetor3 {
    const massaTotalKg = this.massaTotalKg;
    let x = 0, y = 0, z = 0;
    for (const objeto of this.objetos) {
      const v = objeto.getEstadoFisico().velocidadeMps, peso = objeto.massaKg / massaTotalKg;
      x += v.x * peso; y += v.y * peso; z += v.z * peso;
    }
    return new Vetor3(x, y, z);
  }

  /** Obtém ωZ=LZ/IZ em rad/s; L intrínseco soma r×m(v−Vg) e Ipróprio·ω.
   * Subtrair Vg antes dos produtos evita torque numérico por cancelamento de
   * velocidades orbitais com braços pequenos. Não integra nem altera corpos.
   * @contract f-20bfea7b2e381c3a
   */
  private obterVelocidadeAngularAtual(centroMassa: Vetor3): number {
    const centroVel = this.obterVelocidadeDoCentroAtual();
    const momentoAngularZ = this.objetos.reduce((soma, objeto) => {
      const estado = objeto.getEstadoFisico();
      const bx = estado.posicaoM.x - centroMassa.x, by = estado.posicaoM.y - centroMassa.y;
      return soma + (bx * ((estado.velocidadeMps.y - centroVel.y) * objeto.massaKg) - by * ((estado.velocidadeMps.x - centroVel.x) * objeto.massaKg))
        + objeto.getMomentoInerciaKgM2().z * estado.velocidadeAngularRadps.z;
    }, 0);
    return momentoAngularZ / this.obterInerciaCompostaZ();
  }

  /** Soma Ipróprio,Z+m|p−G|² para cada membro, em kg·m²; consulta massa/pose atuais. @contract f-628f59665bf573bc @reviewed M12-DOC: implementação lida. */
  private obterInerciaCompostaZ(): number {
    return this.objetos.reduce((soma, objeto) => {
      const referenciaLocal = this.referenciasLocaisM.get(objeto)!;
      return soma + objeto.getMomentoInerciaKgM2().z + objeto.massaKg * referenciaLocal.magnitude ** 2;
    }, 0);
  }

  /** Aplica rotação XY pelo ângulo em rad, preservando Z; retorna novo vetor. @contract f-22d65dbe670ae3c2 @reviewed M12-DOC: implementação lida. */
  private rotacionarNoPlano(vetor: Vetor3, anguloRad: number): Vetor3 {
    const cos = Math.cos(anguloRad);
    const sen = Math.sin(anguloRad);
    return new Vetor3(vetor.x * cos - vetor.y * sen, vetor.x * sen + vetor.y * cos, vetor.z);
  }

  /**
   * Recalibra os bracos locais quando a massa dos membros muda.
   *
   * Combustivel consumido altera o centro de massa sem mover os pontos dos
   * membros. Manter referencias calculadas com a massa inicial faria a
   * projecao rigida deslocar artificialmente o conjunto a cada passo.
   * @remarks Quando a massa total difere, recalcula referências locais em relação ao novo G e atualiza massa de referência; não desloca membros por si.
   * @contract f-75836752bdbbb79a
   * @reviewed M12-DOC: contrato confrontado com implementação.
   */
  private atualizarReferenciasLocaisPelaMassaAtual(): void {
    const massaAtualKg = this.massaTotalKg;
    if (massaAtualKg === this.massaDasReferenciasKg) return;
    const centroMassa = this.obterCentroDeMassaAtual();
    for (const objeto of this.objetos) {
      this.referenciasLocaisM.set(
        objeto,
        this.rotacionarNoPlano(objeto.getEstadoFisico().posicaoM.subtrair(centroMassa), -this.anguloDoConjuntoRad),
      );
    }
    this.massaDasReferenciasKg = massaAtualKg;
  }
}
