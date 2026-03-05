## Versión: 1.8.2 | Última actualización: 2026-03-04
# Directiva
**Objetivo:** Evitar la excepción DOMException interactiva ("Must be handling a user gesture to show a permission request") causada por transiciones de callbacks asincrónicas en el QR Web Bluetooth.
**Entradas:** Archivo `app.js` v1.8.1.
**Salidas:** Modificación de `onScanSuccess` para insertar un botón explícito y pausar el escáner QR. 
**Restricciones/Historial de Aprendizaje:**
- **Trampas conocidas (Web Bluetooth User Gesture):** Para proteger a los usuarios de spam, Chrome y navegadores modernos requieren que `navigator.bluetooth.requestDevice` *exclusivamente* sea ejecutado bajo una cadena sincronizada derivada del Click o Touch intencional del usuario. Los timeouts o promesas largas (como las producidas al procesar la cámara del celular o un procesamiento de imagen prolongado) destruyen el *Transient user activation* o token de confianza del click. Esto causó el quiebro del flujo automatizado `setTimeout()` establecido.
- **Solución (El Paso de Memoria):** *Nota: No automatizar el `handleAddDeviceIntiface()` mediante un setTimeout o .then de una promesa asíncrona larga.  En su lugar, usar `innerHTML` para cambiar dinámicamente el cuadro de resultado al mensaje: "ID Detectado". y acompañarlo de un botón "Vincular" cuyo evento `onclick` conecte de manera sincrónica al dispositivo.* 
