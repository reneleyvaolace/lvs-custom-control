## Versión: 1.7.0 | Última actualización: 2026-03-04
# Directiva
**Objetivo:** Integrar modos de vibración rítmica (pulso, ola, etc.) extraídos de la documentación de Intiface / Buttplug.io (detectados vía sniffing de protocolo) en la interfaz actual estilo Intiface Central.
**Entradas:** Archivos app.js e index.html generados en la versión 1.6.0.
**Salidas:** Nueva funcionalidad para lanzar patrones rítmicos. Modificación del DOM para albergar botones P1 a P6 en el área del Device Card de cada dispositivo.
**Restricciones/Historial de Aprendizaje:**
- **Observación Trazabilidad**: El repositorio LS-Buttplug y LVS-Gateway no contaban con todos los modos integrados en `muse.cpp` inicialmente. Al revisar los logs de 'docs.buttplug.io' (issue report), identificamos los modos 4 a 9 equivalentes a los comandos:
  - Mode 4: `0xE1, 0x31, 0x3B`
  - Mode 5 (Fast Pulse): `0xE0, 0xB8, 0x2A`
  - Mode 6: `0xE3, 0x23, 0x18`
  - Mode 7: `0xE2, 0xAA, 0x09`
  - Mode 8: `0xED, 0x5D, 0xF1`
  - Mode 9: `0xEC, 0xD4, 0xE0`
- **Cambio Estructural**: Estos 6 patrones deben registrarse en el objeto `CMD` de `app.js` y disponer de una hilera de botones en la tarjeta de cada dispositivo `wbMSE` conectado.
- **Seguridad**: Asegurar usar `gMultiDevices[deviceId]` antes de enviar las funciones, y no quebrar la UI de sliders.
