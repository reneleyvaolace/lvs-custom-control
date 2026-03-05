## Versión: 1.0.0 | Última actualización: 2026-03-04

# Directiva: Controlador BLE para Dispositivo Love Spouse

## Objetivo
Aplicación web (HTML/JS vanilla) que use la Web Bluetooth API para escanear, conectar y enviar comandos a un dispositivo Love Spouse via BLE.

## Entradas
- Interacción del usuario: botones de control en la UI.
- Dispositivo BLE: Love Spouse (filtra por manufacturer data).

## Salidas
- Paquetes de datos escritos en la característica GATT del dispositivo.

## Protocolo de Comunicación
- **Company ID (Manufacturer):** 0xFFF0 (little-endian en advertising: `F0 FF`)
- **Prefijo del paquete (8 bytes):** `6D B6 43 CE 97 FE 42 7C`
- **Formato de payload completo:** [Prefijo 8 bytes] + [Comando 3 bytes]

### Comandos
| Acción      | Bytes (hex)  |
|-------------|--------------|
| Detener     | E5 15 7D     |
| Velocidad 3 | E6 8E 4F     |

### Comandos adicionales (patrón inferido)
| Acción      | Bytes (hex)  |
|-------------|--------------|
| Velocidad 1 | E6 8E 01     |  ← especulativo, completar con reverse engineering
| Velocidad 2 | E6 8E 1F     |  ← especulativo

## Arquitectura GATT
Los dispositivos Love Spouse (y similares) exponen típicamente:
- **Service UUID primario:** `0000fff0-0000-1000-8000-00805f9b34fb` (UUID corto FFF0)
- **Write Characteristic UUID:** `0000fff2-0000-1000-8000-00805f9b34fb` o similar (FFF1/FFF2)
- El filtro de escaneo usa `manufacturerData` con companyIdentifier `0xFFF0`.

## Lógica de Escaneo/Filtro
```
navigator.bluetooth.requestDevice({
  filters: [{
    manufacturerData: [{ companyIdentifier: 0xFFF0 }]
  }],
  optionalServices: ['0000fff0-0000-1000-8000-00805f9b34fb']
})
```

## Restricciones Conocidas
- La Web Bluetooth API solo funciona en Chrome/Edge en HTTPS o localhost.
- NO funciona en Firefox ni Safari (sin flags).
- El prefijo de 11 bytes mencionado por el usuario parece ser 8 bytes (`6DB643CE97FE427C`); revisar si hay 3 bytes adicionales.
- Es posible que el service UUID y el characteristic UUID deban descubrirse con una herramienta como nRF Connect.

## Historial de Aprendizaje
- v1.0.0: Creación inicial. Prefijo asumido de 8 bytes (4 pares de hex en la cadena dada).
