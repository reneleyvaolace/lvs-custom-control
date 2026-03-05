## Versión: 1.8.0 | Última actualización: 2026-03-04
# Directiva
**Objetivo:** Integrar un escáner de códigos QR usando `html5-qrcode` como una tercera opción de vinculación, permitiendo al usuario escanear el manual/caja para extraer el identificador del dispositivo.
**Entradas:** Archivos `app.js` e `index.html` v1.7.2.
**Salidas:** Modal con acceso a cámara web para escaneo, importación de librería `html5-qrcode` vía CDN, botón interactivo en la cabecera `intiface-header`, e inyección de identificador escaneado a los filtros de Web Bluetooth.
**Restricciones/Historial de Aprendizaje:**
- **Trampas conocidas (Bluetooth por Mac/QR):** El Web Bluetooth API prohíbe conexiones directas a direcciones MAC por privacidad. El escaneo de QR no establece una conexión mágica en background (el dispositivo *debe* estar publicando su publicidad BLE localmente), pero permite extraer identificadores exactos para pre-configurar el filtro `namePrefix` del `requestDevice()`.
- **Solución (El Paso de Memoria):** *Nota: No prometer conexión sin autorización del OS. Implementar la cámara, obtener el string del QR y usarlo como prefijo de filtro dinámico, seguido de la apertura automática de la ventana de vinculación estándar.*
