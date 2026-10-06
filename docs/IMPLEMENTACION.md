# Informe de evolución y auditoría

## Auditoría de la base

La versión original ya tenía identidad coherente, 16 portadas locales, React Router, componentes separados, filtros, Fuse.js, reseñas por secciones y configuraciones persistentes. Se conservaron su composición, colores, tipografía, cards, hero, navegación, transiciones y claves de almacenamiento.

La persistencia anterior de Mi lista validaba IDs contra un dataset estático, lo que habría eliminado datos válidos antes de recibir la API. Se cambió por validación estructural; los IDs no disponibles se gestionan explícitamente desde la interfaz.

## Archivos movidos y modificados

El frontend pasó de la raíz a `client/`: `src/`, `public/`, `scripts/`, `tests/`, `index.html`, `vite.config.js`, `playwright.config.js`, `package.json` y `package-lock.json`.

Modificados:

- `client/src/App.jsx`: catálogo API, estados de carga/error, rutas admin y proveedor de sesión.
- `client/src/pages/Home.jsx`, `Explore.jsx`, `Detail.jsx`, `Watchlist.jsx`: datos reales, detalle por slug y manejo de obras no publicadas.
- `client/src/components/ContentCard.jsx`: slug y recuperación de imagen.
- `client/src/hooks/useWatchlist.js`: compatibilidad con IDs de base y contenido no disponible.
- `client/src/lib/search.js`: Fuse.js recibe el catálogo publicado.
- `client/src/data/content.js`: únicamente etiquetas y correspondencia de tipos; los ejemplos se trasladaron al seed del servidor.
- `client/src/main.jsx`: incluye la extensión de CSS administrativo.
- `client/vite.config.js`: proxy local hacia la API; producción usa VITE_API_URL.
- `client/scripts/generate-covers.mjs`: ejemplos tomados del seed al regenerar portadas.
- `client/tests/core.test.js`, `tests/browser/app.spec.js` y `playwright.config.js`: catálogo por API y suite integrada.
- `README.md`, `.gitignore`, `package.json` de raíz y `render.yaml`: documentación y estructura full stack.

Conservados funcionalmente: Header, SearchBar, FilterBar, AccessibilityPanel, Snackbar, useAccessibility, almacenamiento, CSS global y las 16 portadas originales.

## Archivos nuevos

- `client/src/lib/api.js`: URL centralizada, FormData, manejo de errores/401 y token.
- `client/src/hooks/useContent.js`: catálogo y detalle con cancelación de solicitudes.
- `client/src/context/AuthContext.jsx`: verificación de sesión, login, logout y protección de rutas.
- `client/src/pages/admin/{Login,Dashboard,Editor,Preview}.jsx`: espacio editorial.
- `client/src/components/{ApiState,ConfirmDialog}.jsx`: estados recuperables y confirmación destructiva.
- `client/src/styles/admin.css`, `client/public/covers/placeholder.svg`, `client/.env.example`.
- `client/tests/browser/admin.spec.js`: pruebas de administración, errores y responsive.
- `server/package.json`, `package-lock.json`, `.env.example`.
- `server/prisma/schema.prisma`, `demo.json`, `seed.js`, migración SQL inicial y migration_lock.toml.
- `server/src/{app,auth,config,errors,images,index,validation}.js`.
- `server/scripts/{start,cleanup,integration,stack-test,test-stack}.js`.
- `server/tests/{validation.test,images.test,api.integration}.js`.
- `compose.yaml`: PostgreSQL opcional con Docker.
- `.prettierrc.json`, `.prettierignore` y herramientas de formato en la raíz: código JavaScript, JSX y CSS formateado para mantenimiento.

## Funciones implementadas

API pública filtrada por PUBLISHED; administrador JWT/bcrypt sin registro público; dashboard con métricas, búsqueda, filtros por estado, CRUD, publicación/borrador y preview privada. Formularios con campos por tipo, puntos dinámicos, validación y feedback. Upload con preview, tamaño máximo, verificación real del formato, Cloudinary y cola transaccional de eliminación. Edición conserva portada si no llega un archivo. Conflictos de versiones devuelven 409.

Mi lista conserva Deshacer de cinco segundos y localStorage. Accesibilidad mantiene fuentes locales, tamaños, contrastes, espaciado, Escape, foco y restauración. El panel utiliza el mismo sistema visual y en móvil su tabla tiene desplazamiento contenido en el propio bloque.

## Validaciones y límites de la auditoría

- Dependencias instaladas en client y server; auditoría npm sin vulnerabilidades en las versiones finales comprobadas.
- Frontend compila en Vite.
- Prisma format y generate se ejecutan; migración inicial generada desde schema y aplicada a PostgreSQL real temporal.
- Seed comprobado dos veces: no duplica ni sobrescribe el administrador.
- Pruebas unitarias del catálogo, búsqueda, almacenamiento, validación, configuración y procesamiento/contrato de imágenes.
- Integración real de API: login correcto/incorrecto, token vencido, rutas protegidas, CORS, filtros, borradores ocultos, creación, edición, publicación, eliminación, conflictos de versión, límites de archivos y reintentos de limpieza.
- Navegador: búsqueda, filtros, detalle, lista persistente, Deshacer y vencimiento, preferencias persistentes, sesión inválida, API caída y ciclo completo editorial.
- Responsive comprobado a 375, 768 y 1440 px; capturas revisadas del inicio y administración.
- Las llamadas Cloudinary externas se sustituyeron por un adaptador solo en pruebas. No se ha probado una cuenta real ni creado servicios de producción sin credenciales del propietario.

Resultado final: 3 pruebas unitarias frontend, 8 backend y 8 recorridos de navegador aprobados; integración API aprobada en PostgreSQL real temporal. Verificado con Node.js 24.20.0 y PostgreSQL 18.4; el despliegue declara Node.js 22.23.3 LTS. Build final: Vite sin errores. Cloudinary real y Render aún requieren configuración del propietario.

## Pasos manuales de publicación

1. Publicar la rama con esta versión en GitHub.
2. Crear PostgreSQL y Web Service en Render, configurar secretos y Cloudinary.
3. Aplicar migraciones (automático en npm start) y ejecutar el seed autorizado.
4. Actualizar el Static Site: Root Directory client, build npm install && npm run build, publish dist, VITE_API_URL real y rewrite SPA.
5. Confirmar CLIENT_URL, retirar ADMIN_PASSWORD tras el seed y probar upload/reemplazo/eliminación en Cloudinary real.

Variables, modelos, rutas y comandos exactos están en el README. No existen credenciales hardcodeadas de producción.
