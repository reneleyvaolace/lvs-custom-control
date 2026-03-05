## Versión: 1.1.0 | Última actualización: 2026-03-04

# Directiva: Controlador BLE para Dispositivo Love Spouse 8154

## Objetivo
Aplicación web (HTML/JS vanilla) que use la Web Bluetooth API para escanear, conectar y enviar comandos a un dispositivo Love Spouse modelo **8154** via BLE.

## Entradas
- Interacción del usuario: botones de control.
- Dispositivo BLE: Love Spouse 8154.

## Historial de Aprendizaje / Restricciones Conocidas

### v1.1.0 — 2026-03-04 — CRÍTICO: Protocolo corregido y verificado
**Fuente:** `simondankelmann/Bluetooth-LE-Spam` en GitHub,
específicamente `LovespouseStopAdvertisementSetGenerator.kt` y `LovespousePlayAdvertisementSetGenerator.kt`.
Reverse engineering original por **@mandomat** (https://mandomat.github.io/2023-11-13-denial-of-pleasure/).

**Nota:** No asumir que el payload son solo 11 bytes. El payload real son **18 bytes**.

### Estructura completa del payload (18 bytes)
```
[FF FF 00] + [6D B6 43 CE 97 FE 42 7C] + [CMD 3B] + [03 03 8F AE]
 Header(3)       Prefix(8)               Command(3)   Appendix(4)
```

**Nota:** El Company ID `0xFFF0` es el Manufacturer ID del advertising BLE.  
El payload en el Manufacturer Data del advertising packet va así:
`FFFF00` + `6DB643CE97FE427C` + `CMD` + `03038FAE`

### Todos los comandos verificados

| Comando | Hex | Modo |
|---|---|---|
| Stop (Classic) | E5 15 7D | Classic |
| Stop (Ind 1) | D5 96 4C | Independent 1 |
| Stop (Ind 2) | A5 11 3F | Independent 2 |
| Classic 1 | E4 9C 6C | Classic |
| Classic 2 | E7 07 5E | Classic |
| **Classic 3** | **E6 8E 4F** | **Classic** ← confirmado por usuario |
| Classic 4 | E1 31 3B | Classic |
| Classic 5 | E0 B8 2A | Classic |
| Classic 6 | E3 23 18 | Classic |
| Classic 7 | E2 AA 09 | Classic |
| Classic 8 | ED 5D F1 | Classic |
| Classic 9 | EC D4 E0 | Classic |
| Ind 1-1 | D4 1F 5D | Independent 1 |
| Ind 1-2 | D7 84 6F | Independent 1 |
| Ind 1-3 | D6 0D 7E | Independent 1 |
| Ind 2-1 | A4 98 2E | Independent 2 |
| Ind 2-2 | A7 03 1C | Independent 2 |
| Ind 2-3 | A6 8A 0D | Independent 2 |

### Nota sobre el modelo 8154
- No existe documentación pública con comandos **específicos** del modelo 8154.
- El ID "8154" es el código de emparejamiento de la app Love Spouse (análogo a "7043", "8870", etc.).
- Los comandos del protocolo BLE son **genéricos para toda la familia Love Spouse** que usa Company ID 0xFFF0.
- El filtro de escaneo BLE debe buscar por nombre que contenga '8154' o 'LVS-8154'.

### ADVERTENCIA sobre el mecanismo de control
- Los Love Spouse **actúan como periférico** que escucha **advertisements BLE** (no GATT writes).
- La app móvil crea un **BLE Advertiser** que emite los paquetes de manufacturer data.
- La **Web Bluetooth API estándar** NO permite crear advertisers desde el navegador.
- El intento por GATT write puede o no funcionar, dependiendo del firmware del modelo.
- Para control por advertising se requiere: Chrome Experimental (`#enable-experimental-web-platform-features`) o una app nativa.

### Restricciones de la Web Bluetooth API
- Solo funciona en Chrome/Edge en HTTPS o localhost.
- NO funciona en Firefox ni Safari (sin flags).
- `navigator.bluetooth.requestLEScan()` para scanning activo es experimental y no disponible en todos los builds.

## Estructura de Filtros BLE para modelo 8154
```js
filters: [
  { name: 'LVS-8154' },
  { namePrefix: '8154' },
  { manufacturerData: [{ companyIdentifier: 0xFFF0 }] },
  { namePrefix: 'LVS' },
]
```

## Versión 1.0.0 — 2026-03-04
- Creación inicial. Prefijo asumido de 8 bytes. Sin apéndice.
