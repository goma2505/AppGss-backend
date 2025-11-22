// Script para mostrar los códigos de acceso personalizados
// No requiere conexión a base de datos

console.log('🔐 CÓDIGOS DE ACCESO PERSONALIZADOS');
console.log('=====================================\n');

// Códigos definidos en el sistema
const customAccessCodes = {
  'administrador': 'ADM-10000000025',
  'guardia': 'GRD-10000000030',
  'residente': 'RES-10000000035'
};

// Servicios/Fraccionamientos disponibles
const services = [
  'ALBA - Alba',
  'SANJULIAN1 - San Julian 1',
  'CARTAGENA - Cartagena',
  'CATALUNA - Cataluña',
  'PRIVANZA - Privanza',
  'GUIAR - Guiar',
  'LYRATA - Lyrata',
  'LINTEL - Lintel',
  'CASASYES - Casas Yes',
  'PORTALES - Portales de la Luz',
  'MONTEOLIVO - Monte Olivo'
];

console.log('📋 CÓDIGOS ÚNICOS PARA TODOS LOS SERVICIOS:');
console.log('-------------------------------------------');
for (const [role, code] of Object.entries(customAccessCodes)) {
  console.log(`${role.toUpperCase().padEnd(15)}: ${code}`);
}

console.log('\n🏢 SERVICIOS/FRACCIONAMIENTOS DISPONIBLES:');
console.log('------------------------------------------');
services.forEach((service, index) => {
  console.log(`${(index + 1).toString().padStart(2)}. ${service}`);
});

console.log('\n✅ CARACTERÍSTICAS DE LOS CÓDIGOS:');
console.log('----------------------------------');
console.log('• Códigos permanentes (sin fecha de expiración)');
console.log('• Válidos para TODOS los servicios/fraccionamientos');
console.log('• Únicos por tipo de usuario (Administrador, Guardia, Residente)');
console.log('• Formato: [PREFIJO]-[NÚMERO_ÚNICO]');

console.log('\n📝 INSTRUCCIONES DE USO:');
console.log('------------------------');
console.log('1. Al registrarse, seleccionar el servicio/fraccionamiento');
console.log('2. Ingresar el código correspondiente al tipo de usuario');
console.log('3. Los códigos son los mismos para todos los servicios');
console.log('4. No es necesario memorizar códigos diferentes por servicio');

console.log('\n🔒 SEGURIDAD:');
console.log('-------------');
console.log('• Cada código es único y no se repite');
console.log('• Los códigos no expiran (permanentes)');
console.log('• Validación automática en el backend');
console.log('• Acceso controlado por rol y servicio');

console.log('\n🎯 CÓDIGOS ACTUALIZADOS EXITOSAMENTE');
console.log('====================================');