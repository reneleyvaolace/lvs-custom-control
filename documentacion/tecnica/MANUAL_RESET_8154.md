# Manual Técnico: Sincronización de Hard-Reset (LVS Knight No. 3 - 8154)

## Introducción
Este manual documenta el procedimiento definitivo para resolver el estado de "Luz Sólida/Fija" en juguetes Love Spouse (LVS) modelo 8154 (Knight No. 3), permitiendo su visibilidad en aplicaciones Web Bluetooth personalizadas.

## Escenario de Falla
- El dispositivo enciende con luz fija (no parpadea).
- El escáner de Web Bluetooth o nRF Connect no detecta el dispositivo.
- El dispositivo aparece con "Candado" o solo con el servicio `0x1801` en herramientas de diagnóstico.

## Diagnóstico: El "Secuestro de Hardware"
Los modelos modernos de LVS utilizan un sistema de **Auto-Bonding** (Emparejamiento Automático). Aunque el dispositivo se elimine de la App oficial, el Sistema Operativo (Android/Windows) puede mantener una conexión activa en segundo plano, lo que impide que el chip Bluetooth emita paquetes de "Advertising" (Anuncio).

---

## Procedimiento de Reseteo Maestro (Force Pairing)

### Paso 1: Limpieza del Sistema Operativo (Crucial)
1. Ve a los **Ajustes de Bluetooth** de tu teléfono (Redmi/Xiaomi) o Laptop.
2. Busca en la lista de "Dispositivos previamente vinculados" cualquier entrada que diga: `8154`, `LVS`, `wbMSE`, `Knight` o `Unknown Device`.
3. Selecciona la opción **"Olvidar dispositivo"** o **"Desvincular"**.
4. Apaga el Bluetooth del teléfono por completo durante 10 segundos.

### Paso 2: El Comando de Reset del Juguete
Existen dos métodos físicos para forzar el modo de búsqueda (Parpadeo) en el 8154:
- **Método A (Triple Clic):** Con el juguete encendido, presiona el botón de encendido **3 veces de forma rítmica y rápida**. Esto suele forzar la desvinculación activa del chip Nordic.
- **Método B (Reset por Carga):** Conecta el juguete a su cargador magnético USB. Mientras carga (luz parpadeando por carga), mantén presionado el botón de encendido por **10 a 15 segundos**. Desconéctalo y vuelve a encenderlo.

### Paso 3: Vinculación Web (LVS Custom Control)
1. Asegúrate de que la luz del juguete esté **PARPADEANDO**.
2. Entra a la URL de control (vía LocalTunnel o Localhost).
3. Activa el botón **🧬 DEEP SCAN** (Color Rojo).
4. Dale a **"Add Device"**. 
5. El dispositivo ahora aparecerá en la lista nativa del navegador.

---

## Notas de Ingeniería
- **Web Bluetooth Security:** El navegador requiere que la conexión sea HTTPS para habilitar la antena.
- **GPS/Ubicación:** En dispositivos Android, el permiso de ubicación debe estar encendido para que el navegador "vea" señales Bluetooth.
- **Filtros de Búsqueda:** Nuestra App está pre-configurada para buscar el prefijo `8154` extraído del QR.
