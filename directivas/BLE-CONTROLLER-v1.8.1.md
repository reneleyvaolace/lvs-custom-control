## Versión: 1.8.1 | Última actualización: 2026-03-04
# Directiva
**Objetivo:** Permitir la subida de una imagen (archivo) contenida el código QR como cuarto método de vinculación, empleando la misma librería html5-qrcode.
**Entradas:** Archivos `app.js` e `index.html` v1.8.0.
**Salidas:** Nuevo botón "Cargar QR" para seleccionar un archivo de imagen en el visor `intiface-header`. Nueva lógica en JS a través de `Html5Qrcode.scanFile()` para decodificar QR estáticos sin necesidad de cámara web.
**Restricciones/Historial de Aprendizaje:**
- **Trampas conocidas (Cámara obligatoria):** Las APIs de escáner en muchas librerías solicitan explícitamente cámara web, excluyendo usuarios sin cámara o aquellos que reciben las fotos por medios externos (ej: mensajería).
- **Solución (El Paso de Memoria):** *Nota: No restringir el escaneo de QR a la cámara web. Aprovechar `Html5Qrcode.scanFile()` para leer una imagen local seleccionada por `<input type="file">`, procesarla subyacentemente usando el mismo DOM oculto y reutilizar el flujo de inyección del identificador para el empalme de Web Bluetooth.*
