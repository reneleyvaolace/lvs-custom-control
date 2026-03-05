## Versión: 1.6.0 | Última actualización: 2026-03-04

# Directiva: Interfaz Inspirada en Intiface Central y Soporte Multidispositivo

## Objetivo
Analizar el modelo visual de Intiface Central y rediseñar la interfaz de usuario de LVS Control para asemejarse a un panel de control (Dashboard). La mejora clave es permitir la conexión y gestión simultánea de múltiples dispositivos (con prefijo wbMSE), donde cada uno aparece en una lista con su propio control deslizante (slider) de intensidad.

## Diseño Visual (Intiface Central Style)
- **Dashboard Layout:** Dividir la vista en un área principal donde los dispositivos conectados se apilan en forma de tarjetas (cards) horizontales.
- **Tarjetas de Dispositivo:** Cada tarjeta representa una conexión individual.
  - Mostrará el Nombre del Dispositivo y Estado (Batería si está disponible).
  - Incluirá un botón de Desconectar.
  - Incluirá un Slider de Intensidad Proporcional (0-100%).
- **Botón Global de Búsqueda:** El inicio de conexión (Add Device) abrirá de forma estándar el prompt de Web Bluetooth. Al seleccionar un nuevo dispositivo, se agregará a la lista sin desconectar los anteriores.

## Refactorización Lógica Multidispositivo
1. **Estado de Dispositivos:** Se reemplazan las variables globales (`gDevice`, `gServer`, `gChar`, `gMainIntensity`, `gBurstInterval`) por un arreglo / diccionario (ej. `gDevices = {}`) donde cada llave es el ID del dispositivo de Web Bluetooth.
2. **Ciclo de Envío:** La ráfaga (burst) debe ser independiente por dispositivo o iterar la lista de dispositivos conectados y enviar el comando activo a los que correspondan.
3. **Mapeo del Comando:** El slider proporcional se mantiene enviando el CMD basado en `0xE6 0x8E [Byte2]`.
4. **Desconexiones:** Si se emite un `gattserverdisconnected`, el dispositivo específico se remueve del DOM y de `gDevices`.

## Restricciones/Historial de Aprendizaje
- **Limitación de Web Bluetooth:** No se puede tener un "escaneo pasivo (background scanning)" en navegadores web. El usuario DEBE pulsar un botón explícito ("Añadir Dispositivo") cada vez que busque conectar uno.
- **Ráfaga Aislada:** El intervalo de ráfaga debe manejar correctamente la característica GATT particular de cada dispositivo.
- **DOM Dinámico:** La UI de los dispositivos conectados será generada dinámicamente mediante JavaScript (`document.createElement`).
