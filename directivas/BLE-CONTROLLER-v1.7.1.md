## Versión: 1.7.1 | Última actualización: 2026-03-04
# Directiva
**Objetivo:** Permitir el descubrimiento exitoso de dispositivos compatibles aflojando los filtros restrictivos del Web Bluetooth API en el modo Intiface Central (Dashboard).
**Entradas:** Archivo `app.js` v1.7.0.
**Salidas:** Modificación en las opciones `requestDevice` de la función `handleAddDeviceIntiface` para soportar `DeepScan` y filtros relajados.
**Restricciones/Historial de Aprendizaje:**
- **Trampas conocidas (Bug de Autenticación BLE):** Al utilizar `navigator.bluetooth.requestDevice`, si se usan filtros muy estrictos como un ID directo (`wbMSE`) y un único `companyIdentifier: 0xFFF0`, el navegador devolverá "No se encontraron dispositivos" si la capa BLE del equipo interpreta el identificador de manera diferente (ej. si carece temporalmente del flag `name` antes de enlazar, o es otra variante del fabricante).
- **Solución (El Paso de Memoria):** *Nota: No usar nombres exactos estrictos en el modo Intiface ("wbMSE") con clausulas condicionales cerradas. En su lugar, emular la estructura relajada del modo Classic (`gDeepScan` usando `acceptAllDevices` o prefijos genéricos `wb`, `Love`, `LVS`) y atrapar excepciones en `server.getPrimaryService` escaneando arreglos dinámicos.* Las opciones de escaneo han sido actualizadas permanentemente en `app.js`.
