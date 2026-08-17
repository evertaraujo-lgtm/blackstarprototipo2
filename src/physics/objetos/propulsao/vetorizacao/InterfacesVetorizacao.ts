/** Comando de atitude solicitado por controle de voo, em radianos. */
export interface ComandoVetorizacao {
  readonly anguloAlvoRad: number;
}

/** Leitura imutável de um mecanismo de gimbal. */
export interface EstadoVetorizacao {
  readonly anguloAlvoRad: number;
  readonly anguloAtualRad: number;
  readonly limiteAngularRad: number;
  readonly velocidadeAngularMaximaRadps: number;
  readonly estaHabilitado: boolean;
}

/** Dados físicos do mecanismo, separados do motor termodinâmico. */
export interface DefinicaoSistemaVetorizacao {
  /** Desvio máximo em cada lado do eixo nominal, em radianos. */
  readonly limiteAngularRad: number;
  /** Taxa máxima com que o atuador alcança o comando, em rad/s. */
  readonly velocidadeAngularMaximaRadps: number;
}

/** Fronteira para futuros atuadores hidráulicos, elétricos ou eletromecânicos. */
export interface IAtuadorVetorizacao {
  solicitar(comando: ComandoVetorizacao): boolean;
  avancar(dtS: number, habilitado: boolean): void;
  obterEstado(): EstadoVetorizacao;
}

/** Capacidade consultada por controladores sem expor a implementação do motor. */
export interface ICapacidadeVetorizacao {
  solicitarVetorizacao(anguloAlvoRad: number): boolean;
  obterEstadoDaVetorizacao(): EstadoVetorizacao;
}
