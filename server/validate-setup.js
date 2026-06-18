import fs from 'fs';
import path from 'path';

const checks = [];
let passCount = 0;
let failCount = 0;

function check(name, condition, error) {
  if (condition) {
    console.log(`✅ ${name}`);
    passCount++;
  } else {
    console.log(`❌ ${name}: ${error}`);
    failCount++;
  }
}

console.log('\n=== Validación de Setup ===\n');

// Verificar .env
check(
  'Archivo .env existe',
  fs.existsSync(path.resolve('.env')),
  'Crea server/.env con PORT, NODE_ENV, CORS_ORIGIN'
);

// Verificar Excel
check(
  'Excel fuente existe',
  fs.existsSync(path.resolve('../OTROS/DETALLE CARPETAS DEPTO. LICENCIAS DE CONDUCIR 2026.xlsx')),
  'Verifica que OTROS/DETALLE CARPETAS... esté en lugar correcto'
);

// Verificar node_modules
check(
  'Dependencias instaladas (node_modules)',
  fs.existsSync(path.resolve('node_modules')),
  'Ejecuta: npm install'
);

// Verificar estructura de carpetas
check(
  'Carpeta src existe',
  fs.existsSync(path.resolve('src')),
  'La carpeta src/ debe existir'
);

check(
  'Archivo app.js existe',
  fs.existsSync(path.resolve('src/app.js')),
  'El archivo src/app.js debe existir'
);

console.log(`\n=== Resultado ===`);
console.log(`✅ Pasados: ${passCount}`);
console.log(`❌ Fallidos: ${failCount}`);

if (failCount > 0) {
  console.log('\n⚠️  Por favor corrige los errores antes de ejecutar el servidor.');
  process.exit(1);
} else {
  console.log('\n🚀 ¡Setup válido! Puedes ejecutar: npm run dev\n');
}
