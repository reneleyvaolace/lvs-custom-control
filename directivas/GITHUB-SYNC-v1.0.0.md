# Directiva: Sincronización con GitHub
## Versión: 1.0.0 | Última actualización: 2026-03-04

### Objetivo
Establecer y mantener un repositorio privado en GitHub para el proyecto `lvs-custom-control`, asegurando que el desarrollo continúe de manera controlada y persistente.

### Entrada
- Código fuente local en `c:\Proyectos\lvs-custom-control`.
- Credenciales de GitHub (vía GitHub MCP Server).

### Salida
- Repositorio privado en `https://github.com/reneleyvaolace/lvs-custom-control`.
- Historial de commits inicializado localmente y sincronizado.

### Lógica y Pasos
1. **Creación del Repositorio:** Utilizar el servidor MCP de GitHub para crear el repositorio `lvs-custom-control` como privado.
2. **Inicialización Local:**
   - Ejecutar `git init`.
   - Crear un `.gitignore` adecuado para evitar subir archivos temporales (`.tmp/`, `activity.log`, `.env`).
3. **Primer Commit:**
   - Añadir todos los archivos permitidos.
   - Realizar el commit inicial: `Initial commit: Base project structure and directives`.
4. **Vinculación:**
   - Agregar el remoto `origin`.
   - Renombrar la rama principal a `main`.
5. **Sincronización:**
   - Empujar los cambios: `git push -u origin main`.

### Restricciones / Historial de Aprendizaje
- **Seguridad:** El archivo `.env` y los logs de actividad (`activity.log`) NUNCA deben subirse al repositorio público o privado por razones de seguridad y limpieza.
- **Idempotencia:** Si el repositorio ya existe, el script de vinculación debe manejarlo sin fallar.
- **Conectividad:** Sincronización exitosa con la URL proporcionada por el usuario el 2026-03-04.

### Skills Utilizadas
- GitHub MCP Server (create_repository).
- Git CLI (init, add, commit, push).
