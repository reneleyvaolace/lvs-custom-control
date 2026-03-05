## Versión: 1.5.0 | Última actualización: 2026-03-04

# Directiva: Integración de Protocolos de 11 Bytes para Control Dual (muse.cpp)

## Objetivo
Analizar y extraer los patrones de vibración adicionales descubiertos en el repositorio LVS-Gateway (muse.cpp) para integrarlos al controlador LVS, en específico, dar soporte a control dual para dispositivos (modo Canal 1 y Canal 2) utilizando una ventana modal como UI.

## Patrones Detectados y Estructuras (Canal 1 y 2)
Se ha procedido al análisis de los códigos base extraídos y se han determinado los siguientes prefijos para cada comando (GATT characteristic values):
- **Canal 1:** STOP (D5 96 4C), LOW (D4 1F 5D), MED (D7 84 6F), HIGH (D6 0D 7E)
- **Canal 2:** STOP (A5 11 3F), LOW (A4 98 2E), MED (A7 03 1C), HIGH (A6 8A 0D)

## Interfaz de Usuario (Cumpliendo Regla Modal)
Se desarrollará una ventana Modal (dentro del estándar HTML actual) que se invocará con un nuevo botón "Control Dual" ubicado en la sección de control general. Este modal contendrá botones correspondientes a los controles independientes para los canales 1 y 2.

## Restricciones/Historial de Aprendizaje
- **Restricción 1:** No se modifica la lógica de modo de paquete de 18 Bytes actual, la capa de envío es transparente. Los bytes sólo afectan al comando (CMD).
- **Restricción 2:** Todo desarrollo nuevo de UI es en modo modal.
- Se debe asegurar de inyectar las nuevas constantes dentro del objeto `CMD` en el script JS.
