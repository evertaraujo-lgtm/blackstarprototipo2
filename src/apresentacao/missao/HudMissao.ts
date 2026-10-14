import type { EventoMissao } from '../../missoes/ContratoMissao';
import type { ObservacaoBss006 } from '../../missoes/TiposMissaoBss006';

export function atualizarHudMissao(raiz: HTMLElement, o: ObservacaoBss006, eventos: readonly EventoMissao[]): void {
  const texto = (id: string, valor: string) => { raiz.querySelector<HTMLElement>(`#${id}`)!.textContent = valor; };
  const graus = (rad: number) => (rad * 180 / Math.PI).toFixed(2);
  raiz.querySelector<HTMLElement>('#configuracao-aquatica')!.hidden = !o.aquatico;
  raiz.querySelector<HTMLElement>('#painel-aquatico')!.hidden = !o.aquatico;
  if (o.aquatico) {
    const a = o.aquatico, coord = (p?: { x: number; y: number }) => p ? `(${p.x.toFixed(3)}, ${p.y.toFixed(3)}) m` : 'não definido (seco)';
    texto('imersao-aquatica', `${a.estado.replaceAll('-', ' ')} · ${(a.fracaoSubmersa * 100).toFixed(2)}%`);
    texto('volume-aquatico', `${a.volumeSubmersoM3.toFixed(4)} / ${a.volumeDeslocavelM3.toFixed(3)} m³`);
    texto('forcas-aquaticas', `${a.forcaEmpuxoN.magnitude.toFixed(0)} / ${a.forcaArrastoN.magnitude.toFixed(0)} N`);
    texto('momento-aquatico', `${a.momentoHidrodinamicoNm.z.toFixed(1)} N·m / ${graus(o.taxaAtitudeLocalRadps)} °/s`);
    texto('entrada-aquatica', `${a.velocidadeEntradaMps.toFixed(2)} m/s / ${(a.energiaEntradaJ / 1000).toFixed(2)} kJ`);
    texto('equilibrio-aquatico', `${a.equilibrioContinuoS.toFixed(2)} s${a.equilibrioObservado ? ' · janela de equilíbrio observada' : ''}`);
    texto('centros-aquaticos', `G ${coord(a.centroMassaM)}\nB ${coord(a.centroEmpuxoM)}\nÁgua: 1025 kg/m³ · fundo a -50 m · sem ondas`);
  }
  texto('estado-execucao', `${o.execucao === 'executando' ? 'Em execução' : o.execucao === 'pausada' ? 'Pausada' : 'Preparada'} · ${o.fase}`);
  texto('altitude', `${o.altitudeM.toFixed(1)} m`); texto('velocidade-radial', `${o.velocidadeRadialMps.toFixed(2)} m/s`);
  texto('velocidade-tangencial', `${o.velocidadeTangencialMps.toFixed(2)} m/s`); texto('atitude', `${graus(o.atitudeLocalRad)}°`);
  texto('tempo-missao', `t = ${o.tempoS.toFixed(2)} s`);
  texto('empuxo', `${(o.empuxoN / 1000).toFixed(1)} kN / ${o.vazaoKgS.toFixed(2)} kg/s`);
  texto('propelentes', `${o.metanoKg.toFixed(1)} / ${o.oxidanteKg.toFixed(1)} kg`);
  texto('massa', `${o.engenharia.massaKg.toFixed(1)} kg`); texto('bateria', `${(o.energiaEletricaJ / 10000).toFixed(1)}%`);
  texto('integridade', `${(o.integridadeMinima * 100).toFixed(1)}%`);
  texto('atuadores', `${graus(o.gimbalRad)}° / ${o.corpos.filter(c => c.deflexaoRad !== undefined).map(c => `${graus(c.deflexaoRad!)}°`).join(' · ')}`);
  texto('controlador', o.modo === 'pouso' ? o.faseControlador : 'Subida · atitude PID');
  texto('erro-alvo', `Alvo ${o.alvoPousoLocalM.toFixed(1)} m · erro ${o.erroAlvoM.toFixed(2)} m`);
  texto('throttle-valor', `${(o.throttle * 100).toFixed(0)}%`);
  const throttle = raiz.querySelector<HTMLInputElement>('#throttle')!; throttle.value = String(o.throttle * 100); throttle.disabled = o.modo === 'pouso';
  texto('autoridade-throttle', o.modo === 'pouso' ? 'Throttle sob controle automático de pouso.' : 'Throttle manual na subida.');
  raiz.querySelector<HTMLButtonElement>('#pausar')!.disabled = o.execucao !== 'executando';
  const iniciar = raiz.querySelector<HTMLButtonElement>('#iniciar')!; iniciar.disabled = o.execucao === 'executando'; iniciar.textContent = o.execucao === 'pausada' ? '▶ Continuar' : '▶ Iniciar';
  for (const b of raiz.querySelectorAll<HTMLButtonElement>('[data-sistema]')) {
    const ligado = o.sistemas[b.dataset.sistema as keyof typeof o.sistemas]; b.setAttribute('aria-pressed', String(ligado));
  }
  for (const modo of ['decolagem', 'pouso'] as const) raiz.querySelector<HTMLButtonElement>(`#modo-${modo}`)!.setAttribute('aria-pressed', String(o.modo === modo));
  const decolou = o.objetivos.find(obj => obj.id === 'decolagem')?.estado === 'atingido';
  raiz.querySelector<HTMLButtonElement>('#aplicar-alvo')!.disabled = decolou;
  raiz.querySelector<HTMLInputElement>('#alvo-pouso')!.disabled = decolou;
  texto('componentes', o.corpos.map(c => `${c.id}: ${(c.integridade * 100).toFixed(1)}% · ${c.massaKg.toFixed(1)} kg`).join('\n')
    + `\nContatos: ${o.contatos.length} · fixadores rompidos: ${o.fixadores.filter(f => f.estado === 'rompido').length}`);
  texto('estado-pouso', o.aquatico ? 'Amerissagem avaliada por imersão, forças e momentos. Apoio bilateral terrestre não se aplica.' : o.pouso.toqueRetorno
    ? `Contato de retorno observado. Repouso geométrico: ${o.pouso.repousoGeometricoS.toFixed(2)} s. Apoio bilateral sustentado: ${o.pouso.apoioBilateralSustentadoS.toFixed(3)} s. ${o.pouso.pousoEstruturalmenteSeguro ? 'Critérios de pouso seguro atendidos.' : 'Pouso seguro não qualificado.'}`
    : 'Retorno ainda não observado.');
  const objetivos = raiz.querySelector<HTMLUListElement>('#objetivos')!; objetivos.replaceChildren(...o.objetivos.map(obj => {
    const li = document.createElement('li'); li.textContent = `${obj.estado === 'atingido' ? '✓' : obj.estado === 'falhou' ? '!' : '○'} ${obj.descricao} · ${obj.estado.replaceAll('-', ' ')}`; li.dataset.estado = obj.estado; return li;
  }));
  const lista = raiz.querySelector<HTMLOListElement>('#eventos')!;
  lista.replaceChildren(...eventos.slice(-14).reverse().map(e => { const li = document.createElement('li');
    const time = document.createElement('span'); time.textContent = `${e.tempoS.toFixed(2)} s`;
    li.append(time, document.createTextNode(` ${e.descricao}`)); return li;
  }));
}
