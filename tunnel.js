const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'client', '.env');

function updateEnv(apiUrl) {
  try {
    fs.writeFileSync(envPath, `VITE_API_URL=${apiUrl}\n`, 'utf8');
    console.log(`\x1b[32m[Tunnel] client/.env actualizado con VITE_API_URL=${apiUrl}\x1b[0m`);
  } catch (error) {
    console.error(`\x1b[31m[Tunnel] Error al actualizar client/.env: ${error.message}\x1b[0m`);
  }
}

function startSshTunnel(port, name, onUrl) {
  console.log(`\x1b[36m[Tunnel] Iniciando túnel para el puerto ${port} (${name})...\x1b[0m`);
  
  // En Windows usamos ssh
  const child = spawn('ssh', [
    '-R', `80:localhost:${port}`,
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'UserKnownHostsFile=NUL',
    'nokey@localhost.run'
  ]);

  let buffer = '';
  let urlFound = false;

  child.stdout.on('data', (data) => {
    const text = data.toString();
    buffer += text;
    
    // Buscar la URL en el buffer
    if (!urlFound) {
      const match = buffer.match(/(https:\/\/[a-zA-Z0-9-.]+\.lhr\.life)/);
      if (match) {
        urlFound = true;
        const url = match[1];
        console.log(`\x1b[32m[Tunnel] ${name} expuesto en: ${url}\x1b[0m`);
        onUrl(url);
      }
    }
  });

  child.stderr.on('data', (data) => {
    // Se ignoran los mensajes por stderr (TTY, etc.)
  });

  child.on('close', (code) => {
    console.log(`\x1b[31m[Tunnel] Conexión SSH de ${name} cerrada con código ${code}. Reiniciando en 5 segundos...\x1b[0m`);
    setTimeout(() => {
      startSshTunnel(port, name, onUrl);
    }, 5000);
  });

  return child;
}

// Iniciar túnel de la API primero
startSshTunnel(3002, 'Backend (API)', (apiUrl) => {
  // Actualizar el .env con la URL de la API
  updateEnv(apiUrl);
  
  // Levantar el túnel del Frontend
  startSshTunnel(3005, 'Frontend (Vite)', (frontUrl) => {
    console.log('\n\x1b[42m\x1b[30m==================================================\x1b[0m');
    console.log(`\x1b[1m\x1b[32m  ¡ACCESO ONLINE CONFIGURADO CON ÉXITO!  \x1b[0m`);
    console.log(`\x1b[36m  Frontend: \x1b[4m${frontUrl}\x1b[0m`);
    console.log(`\x1b[36m  Backend:  \x1b[4m${apiUrl}\x1b[0m`);
    console.log('\x1b[42m\x1b[30m==================================================\x1b[0m\n');
  });
});
