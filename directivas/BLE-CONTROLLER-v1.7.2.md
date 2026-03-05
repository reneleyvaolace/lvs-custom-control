## Versión: 1.7.2 | Última actualización: 2026-03-04
# Directiva
**Objetivo:** Habilitar el botón "Modo Profundo / Deep Scan" directamente en el Dashboard Intiface (UI multi-dispositivo) para evitar bloqueos del usuario.
**Entradas:** Archivos `app.js` e `index.html` v1.7.1.
**Salidas:** Nueva disposición en `index.html` alineando el botón de escaneo profundo con el botón de "Add Device". Script `app.js` actualizado para cambiar el color del botón indicando su estado.
**Restricciones/Historial de Aprendizaje:**
- **Trampas conocidas (UI Bloqueada):** Al migrar a la nueva interfaz desde el modo viejo modal (antiguo UI), la visualización intencionalmente ocultó todos los botones viejos para simular un dashboard prolijo. Sin embargo, no se expuso la función `toggleDeepScan()` en la nueva UI, aislando la solución principal para evadir el bug de UUIDs.
- **Solución (El Paso de Memoria):** *Nota: Toda funcionalidad transversal y de diagnóstico debe existir en el Header principal o modo Global.* Agregado exitosamente el botón en la etiqueta `intiface-header`.
