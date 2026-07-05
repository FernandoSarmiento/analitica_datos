# Analítica de Datos - Sistema IoT Aves

Proyecto simple para monitoreo de temperatura y humedad desde Thingspeak y registro de pollos.

Instrucciones rápidas:

- Levantar servidor local (recomendado para pruebas):
  ```powershell
  cd C:\Users\USER\analitica_datos
  python -m http.server 8000
  # abrir http://localhost:8000
  ```

- Exportar datos: en la pantalla de "Historial de Alertas" usar los campos "Inicio rango" y "Fin rango" o seleccionar una fecha y pulsar "Exportar datos". Si hay problemas, abre la consola del navegador (F12) y revisa errores de red.

- Cambios recientes:
  - Añadida función `descargarCSV` para permitir descargas locales de CSV.
  - Normalización de formatos de fecha (acepta `dd/mm/yyyy` y `yyyy-mm-dd`).

- Ramas remotas:
  - Los cambios se subirán a `master-local` para no sobrescribir `main`.

Contacto: Fernando Sarmiento <fsarmientoma@unjbg.edu.pe>
