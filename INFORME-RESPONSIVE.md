# Corrección responsive y accesibilidad

Fecha: 8 de octubre de 2026. Cambios implementados sobre el proyecto existente, con su diseño, rutas y opciones de accesibilidad conservados.

## Vistas y componentes corregidos

- Inicio: composición de tres portadas proporcional y centrada, texto y nota con altura natural.
- Explorar, categorías y Mi lista: tarjetas con columnas calculadas según el espacio disponible y el tamaño de fuente; una columna cuando sea necesario.
- Fichas de libros, películas, juegos y series: portada, datos, valoración, ventajas y desventajas se reorganizan en vertical en móvil.
- Comunidad: autores, avatares, fechas, valoraciones, reseñas, respuestas, acciones y formularios permiten crecimiento y saltos de línea.
- Login, registro y edición de perfil: campos limitados al contenedor y etiquetas que se ajustan al ancho.
- Administración: listado editorial en tarjetas con etiquetas de columna en móvil/tablet; estadísticas, editor, filtros y acciones adaptables.
- Usuarios: listado, ficha, historial de actividad, roles, estados y confirmación de ban.
- Moderación: reportes, reseñas y respuestas, incluidos los estados de eliminación lógica disponibles. No se agregaron páginas de papelera inexistentes.
- Diálogos de accesibilidad, reportes y confirmación: ancho acotado al viewport, margen exterior y desplazamiento vertical interno; botones con saltos de línea.
- Cabecera para visitante, USER, EDITOR, ADMIN y SUPER_ADMIN: navegación y cuenta permiten varias filas. Se conserva la navegación existente.
- Pie de página y avisos: contenido ajustable sin ensanchar el documento.

## Causas corregidas

Las portadas del hero tenían coordenadas y dimensiones fijas y una transformación móvil que ocultaba partes de la composición. Ahora están dentro de una escena proporcional; la nota ocupa su propio espacio.

La grilla móvil mantenía dos columnas incluso cuando la fuente grande dejaba tarjetas demasiado estrechas. Ahora usa `auto-fit` y mínimos expresados en rem, limitados al 100% disponible.

La tabla editorial imponía un mínimo de 760 px. Hasta 1050 px se presenta como filas/tarjetas, conservando el caption y los encabezados semánticos, y mostrando etiquetas junto a cada dato.

Se corrigieron mínimos implícitos de flex/grid, navegación sin wrap, chips sin saltos de línea, columnas fijas en formularios y editor, y acciones comprimidas. Los controles y las imágenes conservan su proporción y tamaño legible.

El selector de fuentes mostraba textos extensos que no cabían completos en el modo máximo. Sus dos opciones siguen siendo las mismas: Predeterminada y Verdana, con idénticos valores internos. El indicador «Buscar» mantiene su palabra completa en escritorio.

La comunidad tenía un fondo blanco específico en contraste alto que dejaba textos secundarios claros sobre blanco. Ahora usa la misma paleta de alto contraste del resto del sitio.

No se agregó `overflow-x: hidden` al documento para ocultar errores. Se mantienen únicamente los recortes intencionales de imágenes y los elementos destinados a lectores de pantalla.

## Opciones de accesibilidad

Existen 36 combinaciones: 2 fuentes × 3 tamaños × 2 configuraciones de espaciado × 3 contrastes.

La fuente accesible existente es Verdana/Tahoma, una fuente local; no se incorporó ni se afirma usar OpenDyslexic. Se conserva la aclaración de que no garantiza un efecto clínico.

Los tamaños raíz siguen siendo 16, 19 y 22 px. El layout se reorganiza al aumentar el tamaño; no se reduce el tamaño seleccionado para hacerlo entrar en móvil. El máximo espaciado disponible conserva interlineado 1.9 y separación de letras .045em; también se aplica a encabezados, que antes anulaban esa separación. No existe una opción independiente de espaciado de palabras.

| Caso | Fuente | Tamaño | Espaciado | Contraste |
| --- | --- | --- | --- | --- |
| A | Predeterminada | Normal | Normal | Normal |
| B | Verdana | Normal | Normal | Normal |
| C | Predeterminada | Grande | Normal | Normal |
| D | Verdana | Grande | Normal | Normal |
| E | Verdana | Grande | Aumentado | Normal |
| F | Verdana | Muy grande | Aumentado | Alto |

Los seis casos están incluidos en la matriz completa. En F las tarjetas y las acciones se apilan, los textos largos se envuelven y los diálogos permiten desplazamiento vertical sin reducir la fuente.

## Verificación

Anchos: **320, 360, 375, 390, 414, 430, 768 y 1440 px**. Altura de la matriz: 900 px.

`client/tests/browser/responsive.spec.js` recorre las vistas y los cuatro roles con una API y PostgreSQL temporales reales. Para la matriz exhaustiva aplica los atributos de renderizado que usa el hook de accesibilidad y comprueba `document.documentElement.scrollWidth <= clientWidth`; si falla, informa los elementos que exceden el viewport. Además usa los controles reales del panel para seleccionar F y verifica su persistencia tras recargar. Las pruebas existentes verifican también preferencias persistentes de cuentas autenticadas, Escape y restablecimiento.

Se guardan capturas completas y de viewport en `client/test-results/responsive-*.png`, con muestras de escritorio y móvil predeterminadas, F, cabeceras por rol, formularios, fichas e historiales, diálogos, reportes y moderación. Se revisaron visualmente el inicio móvil/escritorio y los diálogos de accesibilidad y ban.

- Pruebas unitarias: **11 aprobadas** (8 backend y 3 frontend).
- Integración: migraciones con preservación de datos, seed idempotente, API, comunidad, permisos, auditoría y concurrencia aprobados.
- Playwright: **11 tests aprobados**, incluida la matriz de **14.112 comprobaciones** de vista/ancho/modo, sin overflow horizontal en las vistas probadas.
- Build frontend: **aprobado**, 1624 módulos; CSS 28.12 kB y JS 370.29 kB.

## Archivos principales

- `client/src/styles/responsive.css`: patrones globales de contenedores, flex/grid, botones, formularios, tarjetas, modales y accesibilidad.
- `client/src/main.jsx`: carga de los patrones después de los estilos existentes.
- `client/src/pages/Home.jsx`: escena proporcional del hero.
- `client/src/pages/admin/Dashboard.jsx`: etiquetas de datos para las filas adaptables.
- `client/src/components/AccessibilityPanel.jsx`: nombres de fuente completos y breves.
- `client/tests/browser/responsive.spec.js`: matriz de modos y vistas, capturas y comprobaciones de overflow.
- `client/playwright.config.js` y `server/scripts/test-stack.js`: puerto de pruebas exclusivo 5187 y origen CORS correspondiente, sin reutilizar un servidor ajeno.

## Publicación

Estos cambios están implementados y verificados **localmente**. No se hizo commit, push ni despliegue en Render durante esta modificación. También permanecen locales los cambios anteriores de usuarios y roles. La versión pública todavía no incorpora esta corrección.
