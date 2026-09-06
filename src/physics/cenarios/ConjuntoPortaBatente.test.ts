import { describe, expect, it } from 'vitest';
import { Vetor3 } from '../Vetor3';
import { criarEnsaioPortaVertical } from './EnsaioPortaVertical';

function comandarAbertura(resistenciaChumbadoresN = 1e7) {
  const e = criarEnsaioPortaVertical({ resistenciaChumbadoresN });
  e.gerador.ligar(); e.porta.ligarAlimentacao(); e.porta.ligarControle(); e.porta.abrir();
  return e;
}

describe('Conjunto composto da porta e do batente', () => {
  it('agrupa os corpos físicos sem duplicar a porta ou suas peças', () => {
    const e = criarEnsaioPortaVertical();
    expect(e.conjunto.porta).toBe(e.porta);
    expect(e.conjunto.trava).toBe(e.trava);
    expect(e.conjunto.pecasDoBatente).toEqual([e.superior, e.inferior, ...e.laterais]);
    expect(new Set(e.conjunto.objetosFisicos).size).toBe(e.conjunto.objetosFisicos.length);
    expect(e.conjunto.apoioEstruturalDisponivel).toBe(true);
  });

  it('corta a força real quando o batente perde a fundação, embora o comando permaneça solicitado', () => {
    const e = comandarAbertura(1);
    e.mundo.avancar(1 / 240);
    expect(e.conjunto.apoioEstruturalDisponivel).toBe(false);
    expect(e.conjunto.motivosDeApoioIndisponivel).toContain('batente sem fundação');
    e.mundo.avancar(1 / 240);
    const energiaCA = e.gerador.energiaEletricaGeradaJ;
    expect(e.porta.comandoAtual).toBe('abrir');
    expect(e.porta.forcaAtualN).toBe(0);
    expect(e.porta.potenciaEletricaAtualW).toBe(0);
    expect(e.contator.estaFechado).toBe(false);
    e.mundo.avancar(0.2);
    expect(e.gerador.energiaEletricaGeradaJ).toBe(energiaCA);
  });

  it('destruir qualquer peça do batente invalida o caminho de reação do cilindro', () => {
    const e = comandarAbertura();
    e.superior.aplicarDanoPorImpacto(e.superior.resistenciaColisaoJ * 2);
    expect(e.superior.integridadeEstrutural).toBe(0);
    expect(e.conjunto.apoioEstruturalDisponivel).toBe(false);
    expect(e.conjunto.motivosDeApoioIndisponivel).toContain('peça do batente destruída');
    e.mundo.avancar(1 / 240);
    expect(e.porta.forcaAtualN).toBe(0);
  });

  it('rompimento da guia também elimina a reação necessária ao movimento', () => {
    const e = criarEnsaioPortaVertical({ resistenciaGuiaN: 1 });
    e.mundo.aplicarForca(e.porta, new Vetor3(1_000, 0, 0));
    e.mundo.avancar(1 / 240);
    expect(e.guia.estaRompida).toBe(true);
    expect(e.conjunto.apoioEstruturalDisponivel).toBe(false);
    expect(e.conjunto.motivosDeApoioIndisponivel).toContain('guia da porta rompida');
  });
});
