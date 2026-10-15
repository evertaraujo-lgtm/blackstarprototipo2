import { ConexaoEletrica } from '../../../conexoes/ConexaoEletrica';
import { Vetor3 } from '../../../Vetor3';
import { LinhaDePropelente } from './LinhaDePropelente';

export interface DefinicaoBombaPropelente { readonly id: string; readonly tensaoNominalV: number; readonly vazaoMaximaKgS: number; readonly potenciaEletricaMaximaW: number; }
export interface CircuitoDeBombeamento { readonly bomba: BombaPropelente; readonly linha: LinhaDePropelente; }

/** Bomba elétrica que converte energia da bateria em vazão limitada pela linha. */
export class BombaPropelente {
  /** Valida identidade, tensão V/vazão máxima kg/s positivas finitas e potência elétrica W não negativa. @contract f-08499cf7b7b5281e @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly definicao: DefinicaoBombaPropelente) {
    if (!definicao.id || !Number.isFinite(definicao.tensaoNominalV) || definicao.tensaoNominalV <= 0 || !Number.isFinite(definicao.vazaoMaximaKgS) || definicao.vazaoMaximaKgS <= 0 || !Number.isFinite(definicao.potenciaEletricaMaximaW) || definicao.potenciaEletricaMaximaW < 0) throw new Error('Definição de bomba inválida.');
  }
  /** Valida massa kg/dt positivo s; tensão incompatível ou conexão indisponível retorna zero. Limita vazão, solicita energia proporcional e pede à linha massa escalada pela energia entregue; altera reservas elétricas/propelente através das portas. @contract f-90c7b4887e2d3c64 @reviewed M12-DOC: implementação lida. */
  public bombear(linha: LinhaDePropelente, conexao: ConexaoEletrica, massaSolicitadaKg: number, dtS: number, posicaoM: Vetor3): number {
    if (!Number.isFinite(massaSolicitadaKg) || massaSolicitadaKg < 0 || !Number.isFinite(dtS) || dtS <= 0) throw new Error('Solicitação de bomba inválida.');
    if (conexao.tensaoNominalV !== this.definicao.tensaoNominalV || conexao.estaIndisponivel) return 0;
    const massaLimitadaKg = Math.min(massaSolicitadaKg, this.definicao.vazaoMaximaKgS * dtS);
    const energiaNecessariaJ = this.definicao.potenciaEletricaMaximaW * dtS * (massaLimitadaKg / (this.definicao.vazaoMaximaKgS * dtS));
    const energiaFornecidaJ = conexao.fornecerEnergia(energiaNecessariaJ);
    const disponibilidadeEletrica = energiaNecessariaJ === 0 ? 1 : energiaFornecidaJ / energiaNecessariaJ;
    return linha.fornecerMassa(massaLimitadaKg * disponibilidadeEletrica, dtS, posicaoM);
  }

  /**
   * Alimentação coordenada: reserva material na proporção de mistura e partilha
   * uma única entrega elétrica. Uma bomba não esgota a bateria antes da outra.
   * Os limites das duas linhas e dos dois tanques são consultados antes da retirada.
   * @contract f-bdeb6af09d1c8e9e
   */
  public static bombearMistura(
    combustivel: CircuitoDeBombeamento, oxidante: CircuitoDeBombeamento,
    conexao: ConexaoEletrica, massaCombustivelSolicitadaKg: number,
    razaoMistura: number, dtS: number, posicaoM: Vetor3,
  ): { readonly massaCombustivelKg: number; readonly massaOxidanteKg: number } {
    if (!Number.isFinite(massaCombustivelSolicitadaKg) || massaCombustivelSolicitadaKg < 0
      || !Number.isFinite(razaoMistura) || razaoMistura <= 0 || !Number.isFinite(dtS) || dtS <= 0) {
      throw new Error('Solicitação de mistura inválida.');
    }
    const indisponivel = conexao.estaIndisponivel
      || [combustivel, oxidante].some(({ bomba }) => bomba.definicao.tensaoNominalV !== conexao.tensaoNominalV);
    if (indisponivel) return { massaCombustivelKg: 0, massaOxidanteKg: 0 };
    /** Devolve `Math.min( bomba.definicao.vazaoMaximaKgS * dtS, linha.obterMassaFornecivelKg(dtS, posicaoM))`. Dependências diretas: `linha.obterMassaFornecivelKg`. Efeitos indiretos seguem as dependências chamadas. @contract f-7bce10b01ea7502f */
    const limite = ({ bomba, linha }: CircuitoDeBombeamento): number => Math.min(
      bomba.definicao.vazaoMaximaKgS * dtS, linha.obterMassaFornecivelKg(dtS, posicaoM));
    const massaCombustivelKg = Math.min(massaCombustivelSolicitadaKg, limite(combustivel), limite(oxidante) / razaoMistura);
    const massaOxidanteKg = massaCombustivelKg * razaoMistura;
    /** Devolve `bomba.definicao.potenciaEletricaMaximaW * massaKg / bomba.definicao.vazaoMaximaKgS`. Efeitos indiretos seguem as dependências chamadas. @contract f-164fe968cbc958d7 */
    const energia = ({ bomba }: CircuitoDeBombeamento, massaKg: number): number =>
      bomba.definicao.potenciaEletricaMaximaW * massaKg / bomba.definicao.vazaoMaximaKgS;
    const energiaNecessariaJ = energia(combustivel, massaCombustivelKg) + energia(oxidante, massaOxidanteKg);
    const energiaFornecidaJ = conexao.fornecerEnergia(energiaNecessariaJ);
    const fracaoEletrica = energiaNecessariaJ === 0 ? 1 : energiaFornecidaJ / energiaNecessariaJ;
    return {
      massaCombustivelKg: combustivel.linha.fornecerMassa(massaCombustivelKg * fracaoEletrica, dtS, posicaoM),
      massaOxidanteKg: oxidante.linha.fornecerMassa(massaOxidanteKg * fracaoEletrica, dtS, posicaoM),
    };
  }
}
