import { writeFileSync, mkdirSync } from 'node:fs';
import { EnsaioReentrada } from '../src/cenarios/EnsaioReentrada';
const raiz = process.cwd();
/** Reproduz quatro receitas de referência por 838 s no core compartilhado,
 * com amostras a cada 10 s e condições/versões completas. A duração é orçamento
 * de coleta; não encerra a missão ou declara sucesso. Grava evidência local.
 * @contract f-d54d78e5c1917df6
   */
async function executarCampanhaReferencias(): Promise<void> {
const saida=[];
for(const [altitudeM,velocidadeMps,vacuo] of [[120000,7700,false],[120000,9000,false],[200000,9000,false],[200000,9000,true]] as const){
 const ensaio=new EnsaioReentrada({altitudeM,velocidadeMps,vacuo}); ensaio.iniciar();
 const inicial=ensaio.observar(); const amostras=[inicial];
 for(let i=0;i<838*240;i++){ensaio.avancarPasso(); if((i+1)%2400===0)amostras.push(ensaio.observar());}
 const final=ensaio.observar();
 saida.push({configuracao:ensaio.configuracao,identificacao:ensaio.obterIdentificacao(),inicial,final,eventos:ensaio.obterEventos(),amostras});
 console.log(JSON.stringify({altitudeM,velocidadeMps,vacuo,w0:inicial.estado.velocidadeAngularRadps.z,w838:final.estado.velocidadeAngularRadps.z,torqueFinal:final.torqueAerodinamicoNm,h:final.altitudeM}));
}
mkdirSync(raiz+'/docs/validacoes/re002',{recursive:true});
writeFileSync(raiz+'/docs/validacoes/re002/depois-correcao-angular.json',JSON.stringify({base:'RE-002B; mesma polar e controle RE001-r1',duracaoS:838,passoS:1/240,ensaios:saida},null,2));

}
await executarCampanhaReferencias();
