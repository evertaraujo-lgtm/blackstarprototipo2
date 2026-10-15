import type { MundoFisico } from '../physics/MundoFisico';
import { Vetor3 } from '../physics/Vetor3';
import type { PrismaDeslocador } from '../physics/agua/GeometriaSubmersa';
import type { MontagemBss } from './MontagemBss';

/** Variante explícita de engenharia: casco/tanques estanques, componentes externos permeáveis.
 * Dimensões/massas/controle históricos inalterados; isto não comprova estanqueidade do veículo real.
 * @contract f-af9fca02b4f4ccdc
 */
export function registrarHidrodinamicaBss006(mundo: MundoFisico, v: MontagemBss): void {
  for (const o of v.objetos) {
    let p: PrismaDeslocador = { dimensoesM: o.dimensoesM, coeficienteArrasto: 1.1 };
    if (o === v.veiculo || o === v.tanqueCombustivel || o === v.tanqueOxidante) p = { ...p, fracaoDeslocamento: 1 };
    else if (o === v.bateria) p = { ...p, fracaoDeslocamento: 0.3 }; // Geometria equivalente do material/caixa aberta, não caixa estanque.
    else if (o === v.painel) p = { ...p, dimensoesM: new Vetor3(3, 0.02, 2) }; // Lâmina externa de 20 mm, sem invólucro de 250 mm fechado.
    else if (o === v.propulsor) p = { ...p, dimensoesM: new Vetor3(1.5, 1.4, 1.4), centroLocalM: new Vetor3(-0.05, 0, 0), fracaoDeslocamento: 0.05 };
    else if (v.aletasAerodinamicas.includes(o as typeof v.aletasAerodinamicas[number])) p = { ...p, fracaoDeslocamento: 0.1 }; // 90% de vazios da grade equivalente.
    else if (o.id.includes('sapata')) p = { ...p, dimensoesM: new Vetor3(1.3, 0.01, 1.2), centroLocalM: new Vetor3(0, -0.145, 0) };
    else if (o.id.includes('perna')) p = { ...p, dimensoesM: new Vetor3(0.4, 3.15, 0.5), centroLocalM: new Vetor3(0, 0.075, 0),
      fracaoDeslocamento: 1 - (0.396 * 0.496) / (0.4 * 0.5) }; // Perfil aberto: parede equivalente de 2 mm; exclui trecho sobre a sapata.
    else throw new Error(`Geometria aquática não declarada: ${o.id}`);
    mundo.registrarGeometriaAquatica(o, p);
  }
}
