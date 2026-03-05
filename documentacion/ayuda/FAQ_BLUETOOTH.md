# Guía de Resolución de Problemas: Conectividad Bluetooth

## Problema: "Mi dispositivo no aparece en la ventana flotante del navegador (Ni con Deep Scan)"

**Diagnóstico Técnico:**
La ventana blanca que despliega tu navegador web (Chrome, Edge, etc.) es el **Browser/Native Picker**. Esta herramienta busca señales Bluetooth tipo "Advertising" (o "Modo Anuncio") que los dispositivos emiten para indicar "¡Hey, estoy encendido y listo para que me controlen!". 

Si tu juguete **tiene una luz sólida/fija y no parpadea**, la capa de hardware interna (el chip de Bluetooth Low Energy) **ya se encuentra enlazada a otro equipo** (casi siempre, a tu teléfono móvil mediante la app oficial). 

Por diseño electrónico y seguridad (para evitar que dos equipos controlen o *hackeen* un dispositivo simultáneamente), cuando un juguete BLE se enlaza a un Master, **deja de emitir señales Advertising** inmediatamente. Se vuelve 100% invisible para el resto del mundo, incluyendo nuestra Web App, sin importar qué método de filtros usemos.

## Solución Definitiva (Hard-Reset del Hardware)
Para que el dispositivo aparezca en el escaner de la Web App:

1. **Destruye el enlace previo:** Apaga el Bluetooth de tu celular completamente desde la configuración (no solo desconectarlo, apágalo). También asegúrate de cerrar la aplicación 'Love Spouse' de fondo si está corriendo.
2. **Reinicia el juguete:** Mantén presionado el botón del juguete hasta que se apague.
3. **Modo Emparejamiento:** Vuelve a encender tu juguete. Su luz LED inteligente deberá tener ahora un comportamiento diferente al que veías antes (en el 95% de los modelos, esto es un **parpadeo constante** intermitente).
4. **Acerca tu juguete a la PC:** Ve a la computadora y haz clic en "Add Device" (o escanea el QR nuevamente). Verás al instante el dispositivo en la lista del navegador.

> **Nota para Desarrolladores & Arquitectura:**
> No existe solución programática (código JS/Python) que pueda superar esta restricción física. Si un dispositivo BLE no está en estado "Advertising", la antena de la computadora de escritorio es incapaz de recibir los paquetes. Todas las conexiones en LVS Custom Control requerirán de manera excluyente el cumplimiento de este requisito por parte del usuario.

## Problema Extra: "Mi dispositivo nunca parpadea, tiene luz fija desde que enciende y sigue sin aparecer en la PC"

Si tras desconectar el Bluetooth del celular, apagar y prender el modelo 8154, este sigue emitiendo luz fija desde que lo prendes, entonces el dispositivo **SÍ está transmitiendo señales invisibles por detrás**, pero existe un bloqueo en tu computadora.

**Pasos de diagnóstico en Windows / Chrome:**
1. **El OS se adueñó del dispositivo:** Ve a la configuración de Bluetooth de Windows. Si alguna vez emparejaste el juguete directamente desde Windows ("Agregar dispositivo"), elimínalo de la lista. Web Bluetooth no puede ver dispositivos que el Sistema Operativo ya acaparó.
2. **Tu PC no soporta BLE correctamente:** Algunos adaptadores Bluetooth USB o laptops antiguas soportan Bluetooth "Clásico" (audio, mouse) pero no Low Energy, por lo que nunca verá las tramas emitidas por el modelo 8154.
3. **Prueba de Fuego (Android):** Abre el navegador Chrome **en tu celular Android** (asegurándote de que la app Love Spouse esté desinstalada o forzada a detenerse). Entra a tu aplicación web (si la subes a un servidor seguro o GitHub Pages) e intenta vincular. Chrome en Android tiene un manejo casi perfecto del Web Bluetooth; si allí sí aparece, el "culpable" es el hardware/driver de Bluetooth de tu computadora de escritorio, no la aplicación.
