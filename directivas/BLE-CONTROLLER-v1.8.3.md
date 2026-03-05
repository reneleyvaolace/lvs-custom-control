## Versión: 1.8.3 | Última actualización: 2026-03-04
# Directiva
**Objetivo:** Documentar la justificación técnica del "Botón de Tránsito" (Lanzar vinculación Bluetooth) tras el escaneo exitoso del QR, para educar al usuario y prevenir intentos de automatización inseguros que violen las políticas del navegador.
**Entradas:** N/A (Explicación arquitectónica).
**Salidas:** N/A.
**Restricciones/Historial de Aprendizaje:**
- **Trampas conocidas (Expectativa de Conexión "Cero Clics" con Web Bluetooth):** El usuario espera que, al subir o escanear un QR, el dispositivo se vincule automáticamente en segundo plano (bypass total). Sin embargo, la Web Bluetooth API está diseñada bajo un modelo de seguridad de "Aprobación Explícita", requiriendo dos cosas inviolables:
  1. Que la ejecución nazca de un click real, en un tiempo límite menor a ~5 segundos (Gestos asíncronos largos como decodificar una imagen destruyen este permiso).
  2. Que SIEMPRE se muestre al menos una vez la ventanita nativa del navegador (el "Picker") para que el usuario seleccione el dispositivo encontrado, impidiendo conexiones fantasmas o secuestros de dispositivos en background.
- **Solución (El Paso de Memoria):** *Nota: Es arquitectónicamente imposible en una Web App saltarse el evento del click intermedio para el `requestDevice()` tras la lectura de un QR, así como también es imposible saltarse el "Browser Picker" de Chrome/Edge. Estas características están blindadas directamente en el código C++ del motor de Chromium (Blink) por razones de privacidad y seguridad.*
