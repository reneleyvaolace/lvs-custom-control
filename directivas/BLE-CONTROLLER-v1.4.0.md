## Versión: 1.4.0 | Última actualizada: 2026-03-04

# Directiva: Soporte Multidispositivo LVS (8154 y 7043)

## Objetivo
Expandir el controlador para soportar múltiples modelos (Knight No. 3 y ZBTD015), permitiendo al usuario seleccionar el dispositivo antes de conectar y filtrando específicamente por su identificador (BarCode) en el nombre de advertising.

## Dispositivos Soportados

| Modelo | Nombre Comercial | BarCode (ID) | Prefijo BLE | IsPrecise |
|---|---|---|---|---|
| **8154** | Knight No. 3 | 8154 | wbMSE | 1 (0-100) |
| **7043** | ZBTD015 | 7043 | wbMSE | 1 (0-100) |

## Protocolo Compartido
Ambos dispositivos utilizan la misma estructura de Manufacturer Data:
- **Company ID:** 0xFFF0
- **Prefix (8B):** `6D B6 43 CE 97 FE 42 7C`
- **Operación:** Ráfaga de comandos GATT Write (emulando advertising).

## Lógica de Selección y Escaneo
1. **Selector de UI:** El usuario debe elegir el dispositivo objetivo antes de iniciar el escaneo.
2. **Filtro Dinámico:**
   - La búsqueda de dispositivo debe construirse dinámicamente: `wbMSE` + `ID`.
   - Ejemplo para 8154: `wbMSE8154`.
   - Ejemplo para 7043: `wbMSE7043`.
3. **Persistencia:** Guardar la elección del usuario en `localStorage` para conveniencia.

## Control de Intensidad Proporcional
- Se mantiene el uso del slider de 0-100.
- El valor se mapea al **Byte 2** del comando (0-255).
- Comando base para proporcional: `E6 8E` (heredado del modelo HIGH operativo).

## Historial de Aprendizaje
- **v1.4.0:** Se identifica que el nombre de advertising completo concatena el prefijo `wbMSE` con el BarCode/ID del dispositivo. El filtrado específico por este nombre reduce errores de conexión con otros dispositivos cercanos.
