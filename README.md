# Entre líneas

Plataforma de reseñas para Ingeniería de Software. MVP funcional con React, Vite, JavaScript, CSS, Fuse.js y localStorage. Sin backend, claves ni servicios externos en tiempo de ejecución. Las 16 portadas son ilustraciones SVG locales originales, no posters oficiales; las reseñas y puntuaciones son editoriales de demostración.

## Ejecutar

Requiere Node.js 22 o posterior y npm.

```sh
npm install
npm run dev
```

Abrir la dirección que indique Vite (por defecto http://localhost:5173).

```sh
npm run build
npm run preview
npm test
```

El build queda en `dist/`. No abrir `index.html` con doble clic: usar el servidor de Vite.

Pruebas de navegador: `npm run test:e2e` (requiere Microsoft Edge instalado). En otro sistema cambiar `channel: 'msedge'` en `playwright.config.js` por un navegador instalado o instalar Chromium con `npx playwright install chromium` y quitar `channel`.

## Funcionalidades

- Inicio con hero, recomendados y cuatro categorías de cuatro obras.
- Búsqueda difusa por título, género, categoría y creadores; normaliza tildes, espacios y mayúsculas. Probá `señor anios`.
- Explorar con filtros inmediatos por categoría y género, sugerencias y recuperación de resultados vacíos.
- Reseñas en ficha técnica, sinopsis, ventajas, inconvenientes y veredicto. Puntuación con número, estrella y texto.
- Mi lista persistente. Quitar muestra Deshacer durante cinco segundos y restaura la posición original.
- Panel accesible mediante dialog nativo: foco contenido, Escape y retorno al disparador. Fuentes locales, tres tamaños, tres contrastes y espaciado adicional; preferencias persistentes y restablecimiento.
- HTML semántico, enlace para saltar contenido, labels, estados accesibles, foco visible, navegación por teclado y respeto de movimiento reducido.
- Manejo de almacenamiento corrupto o bloqueado; mensajes si no se puede persistir.
- Diseño adaptable a móviles, tablets y escritorio.

Los datos se guardan solo en el navegador y origen actuales. No hay cuentas ni sincronización. Borrar los datos del sitio elimina la lista y preferencias. Verdana es una alternativa local para lectura cómoda; no es OpenDyslexic ni garantiza beneficios clínicos.

## Estructura

`src/components/`: Header, SearchBar, ContentCard, FilterBar, AccessibilityPanel, Snackbar.

`src/pages/`: Home, Explore, Detail, Watchlist.

`src/hooks/`: useAccessibility y useWatchlist.

`src/data/content.js`: base conceptual Topico y propiedades de Libro, Pelicula, Juego y Serie. Se usan objetos de datos simples en vez de clases para facilitar serialización.

`src/lib/`: búsqueda y almacenamiento. `src/styles/global.css`: estilos y preferencias.

`public/covers/`: 16 portadas locales. Para regenerarlas: `node scripts/generate-covers.mjs`.

`tests/`: comprobaciones del catálogo, búsqueda y almacenamiento. `render.yaml`: configuración declarativa del despliegue. `package-lock.json`: dependencias reproducibles.

## Subir a GitHub

Crear un repositorio vacío en GitHub, sin README inicial. Desde esta carpeta:

```sh
git add .
git commit -m "Implementar plataforma Entre líneas"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

La carpeta ya es un repositorio Git. Si ya existe `origin`, verificar `git remote -v` y usar el remoto correcto. `node_modules` y `dist` se excluyen mediante `.gitignore`.

## Render: configuración exacta

En Render elegir **New → Static Site**, conectar el repositorio y configurar:

| Campo | Valor |
| --- | --- |
| Name | entre-lineas (o uno disponible) |
| Branch | main |
| Root Directory | dejar vacío |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |
| Variables de entorno | ninguna |

En **Redirects/Rewrites**, agregar **Source** `/*`, **Destination** `/index.html`, **Action** `Rewrite`. Esto permite recargar `/explorar`, `/mi-lista` y `/resena/anillos` sin un 404.

También se incluye `render.yaml` para desplegar mediante **New → Blueprint**. Ese archivo incluye el build, directorio publicado y rewrite.

Documentación oficial: [Static Sites](https://render.com/docs/static-sites) y [Redirects and Rewrites](https://render.com/docs/redirects-rewrites).

## Verificación manual

1. Buscar `señor anios`; abrir la sugerencia y comprobar las cinco secciones.
2. Aplicar una categoría y un género, limpiar filtros y comprobar resultados vacíos.
3. Agregar dos obras a Mi lista, recargar y comprobar persistencia.
4. Quitar una obra, pulsar Deshacer antes de cinco segundos y verificar su posición. Volver a quitar y dejar expirar el aviso.
5. Cambiar todas las preferencias, recargar y restablecer. Abrir/cerrar con teclado y Escape.
6. Revisar a 375, 768 y 1440 px; con texto muy grande comprobar navegación, cards y ausencia de desbordamiento.

No se ha publicado en una cuenta de GitHub o Render: los archivos están listos para hacerlo con las credenciales del propietario.
