import { verificarDistribuicao } from './site/verificar';

console.log(JSON.stringify(verificarDistribuicao(process.cwd()), null, 2));
