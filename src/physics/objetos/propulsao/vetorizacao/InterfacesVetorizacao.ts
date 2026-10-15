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
  readonly estaFalho?: boolean;
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
  /** Valida e memoriza comando de alvo angular rad, retornando aceitação; posição atual não salta para alvo. @contract f-eca3958041fee892 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  solicitar(comando: ComandoVetorizacao): boolean;
  /** Atualiza posição interna com dt positivo s e habilitação, limitada pelo curso/velocidade; não altera orientação do veículo. @contract f-1ae1e2c05ffd3432 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  avancar(dtS: number, habilitado: boolean): void;
  /** Consulta DTO de alvo/ângulo rad, limites rad/rad/s, habilitação e falha sem expor campos internos. @contract f-c919977cd11dc18b @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  obterEstado(): EstadoVetorizacao;
}

/** Capacidade consultada por controladores sem expor a implementação do motor. */
export interface ICapacidadeVetorizacao {
  /** Solicita ângulo-alvo em rad ao componente de vetorização pelas condições operacionais; retorna aceitação. @contract f-3fbd208aea760120 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  solicitarVetorizacao(anguloAlvoRad: number): boolean;
  /** Consulta estado efetivamente atingido pelo atuador para direção real de empuxo e telemetria. @contract f-905ea8cd292cfbeb @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  obterEstadoDaVetorizacao(): EstadoVetorizacao;
}
