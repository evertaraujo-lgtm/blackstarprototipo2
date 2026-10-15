import { executarAuditoria, verificarBaseExecutavel } from './documentacao/cli';

const modo = process.argv.includes('--gerar') ? 'gerar' : 'verificar';
const resultado = executarAuditoria(process.cwd(), modo);
console.log(JSON.stringify({ ...resultado, cobertura: { ...resultado.cobertura, faltantes: resultado.cobertura.faltantes.slice(0, 20) } }, null, 2));
if (modo === 'verificar' && (resultado.cobertura.faltantes.length || resultado.catalogoDesatualizado || resultado.mapaDesatualizado
  || Object.values(resultado.divergencias).some(a => a.length))) process.exitCode = 1;
if (process.argv.includes('--base-executavel')) {
  const alteradas = verificarBaseExecutavel(process.cwd()); console.log(JSON.stringify({ base: '555635b', executaveisAlterados: alteradas }));
  if (alteradas.length) process.exitCode = 1;
}
