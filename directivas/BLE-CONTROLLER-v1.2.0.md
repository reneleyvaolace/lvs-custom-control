## Versión: 1.2.0 | Última actualizada: 2026-03-04

# Directiva: Controlador BLE Love Spouse 8154 — Con Burst + Shake Mode

## Objetivo
Controlador web BLE completo con: 3 velocidades + stop, envío en ráfaga a 250ms, modo Shake (acelerómetro), y filtro de escaneo por prefijo de nombre `wbMSE`.

---

## Análisis y Reconciliación de Especificaciones v1.2.0

### Especificación del usuario vs. protocolo verificado

| Aspecto | Usuario dice | Verificado (Bluetooth-LE-Spam) | Resolución |
|---|---|---|---|
| Prefijo de nombre | `wbMSE` (77 62 4D 53 45) | Desconocido | **Aceptado**: se agrega al filtro |
| Tamaño paquete | 11 bytes | 18 bytes completos | **Implementar ambos** como modos configurables |
| Comandos | Stop/Baja/Media/Alta | Stop/Classic1-9 | **Verificados**: los 4 del usuario coinciden |
| Prefijo cmd | 0x6DB643CE97FE427C | 0x6DB643CE97FE427C | ✅ Idéntico |
| Header | (no mencionado) | FF FF 00 | Parte del advertising MFR data |
| Apéndice | (no mencionado) | 03 03 8F AE | Parte del advertising MFR data |
| Intervalo | 250ms (advertising) | N/A | **Implementar burst setInterval 250ms** |

### Reconciliación del tamaño de paquete
- Los 11 bytes (PREFIX 8B + CMD 3B) son el **núcleo del comando** en el advertising.
- Los 18 bytes incluyen el header y apéndice del **manufacturer specific data** del advertising packet.
- Para GATT writes (único mecanismo disponible en Web Bluetooth), implementar **modo dual**:
  - **Modo 11B** (spec usuario): solo PREFIX + CMD
  - **Modo 18B** (verificado): HEADER + PREFIX + CMD + APPENDIX
- Por defecto: **11B** (según spec del usuario, que conoce su dispositivo específicamente).

### Prefijo de nombre 'wbMSE'
- Bytes: `77 62 4D 53 45` → string ASCII: `wbMSE`
- Este es el nombre BLE de advertising que emite el dispositivo 8154.
- **Máxima prioridad en el filtro de escaneo.**

### Comandos verificados como correctos ✅

| Botón | Hex | Fuente |
|---|---|---|
| Stop (Parada) | E5 15 7D | ✅ Classic Stop — confirmado en Bluetooth-LE-Spam |
| Baja | E4 9C 6C | ✅ Classic 1 — confirmado en Bluetooth-LE-Spam |
| Media | E7 07 5E | ✅ Classic 2 — confirmado en Bluetooth-LE-Spam |
| Alta | E6 8E 4F | ✅ Classic 3 — confirmado por usuario + Bluetooth-LE-Spam |

---

## Nuevas Funcionalidades v1.2.0

### 1. Burst Mode (Ráfaga a 250ms)
- Al seleccionar una velocidad, se activa un `setInterval` que reenvía el comando cada 250ms.
- Esto simula el advertising continuo que hace la app móvil.
- Al presionar Stop o desconectar, se cancela el intervalo (`clearInterval`).
- Indicador visual animado cuando el burst está activo.

### 2. Modo Shake (Acelerómetro)
- Usa `DeviceMotionEvent` del navegador.
- iOS requiere permiso explícito via `DeviceMotionEvent.requestPermission()`.
- Mapeo de aceleración neta (restando gravedad ~9.8 m/s²):
  - < 2 m/s²: STOP (reposo)
  - 2–5 m/s²: BAJA
  - 5–10 m/s²: MEDIA
  - > 10 m/s²: ALTA
- Throttle de 300ms para no saturar el canal BLE.
- Indicador visual con barra de intensidad en tiempo real.

### 3. Paquete Dual (11B / 18B)
- Toggle en UI para cambiar entre modos.
- Muestra el hex del paquete que se enviará antes de mandarlo.

---

## Historial de Aprendizaje Acumulado

### v1.2.0 — Nombre de advertising identificado
- El dispositivo 8154 se anuncia con prefijo `wbMSE` → es el filtro más directo para encontrarlo.
- Filtro de escaneo definitivo (en orden de prioridad):
  1. `{ namePrefix: 'wbMSE' }` ← nombre real del dispositivo
  2. `{ name: 'LVS-8154' }`
  3. `{ namePrefix: '8154' }`
  4. `{ manufacturerData: [{ companyIdentifier: 0xFFF0 }] }`

### v1.1.0 — Protocolo de 18 bytes verificado
- El advertising MFR data completo es: `FF FF 00` + `6DB643CE97FE427C` + `CMD` + `03038FAE`
- Fuente: `simondankelmann/Bluetooth-LE-Spam` (reverse eng. por @mandomat)

### v1.0.0 — Creación inicial (11B asumidos)

---

## Restricciones Conocidas (Acumuladas)

1. Web Bluetooth API solo en Chrome/Edge, HTTPS o localhost.
2. No permite crear BLE advertisers — se hace GATT write como alternativa.
3. `DeviceMotionEvent.requestPermission()` requerido en iOS 13+.
4. El intervalo de 250ms es para emular el advertising continuo de la app móvil.
5. Si el GATT write no funciona, el dispositivo puede necesitar el advertising real.
