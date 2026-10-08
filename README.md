# Entre líneas · versión full stack

Plataforma de reseñas de libros, películas, juegos y series para Ingeniería de Software. Conserva la identidad visual del frontend original y agrega un espacio editorial con autenticación, base de datos y gestión de imágenes. No hay registro público ni cuentas para lectores.

## Tecnologías y arquitectura

- **Client:** React, Vite, JavaScript, React Router, Fuse.js y el CSS original. Preferencias y Mi lista siguen en localStorage.
- **Server:** Node.js 22+, Express 5, Prisma, PostgreSQL, JWT, bcrypt, Zod, Multer, Sharp y Cloudinary.
- El navegador consulta únicamente reseñas publicadas. Fuse.js busca sobre los datos reales recibidos.
- Cada cuenta envía un único JWT Bearer; el servidor consulta User y sus permisos actuales en cada solicitud. Vigencia: dos horas. Se conserva en sessionStorage por pestaña, con respaldo en memoria si el navegador bloquea ese almacenamiento. Salir borra el token del navegador; un token emitido sigue siendo válido hasta su vencimiento.
- Las imágenes se reciben en memoria (máximo 5 MB), se validan por extensión, MIME y decodificación real, se convierten a WebP y se suben desde el servidor a Cloudinary. No se guardan archivos de usuario en Render.
- Las imágenes reemplazadas o eliminadas se registran en una cola PostgreSQL en la misma transacción de la reseña. Se intenta eliminarlas inmediatamente y cada minuto; la cola sobrevive a reinicios y fallos del proveedor. `npm run images:cleanup` permite procesarla manualmente.
- Las portadas SVG originales de demostración continúan en `client/public/covers`; no están en Cloudinary y no se intenta borrarlas remotamente.

```text
/
├── client/
│   ├── public/covers/          portadas originales y placeholder
│   ├── src/
│   │   ├── components/         componentes originales y feedback/modal
│   │   ├── context/            sesión única y rutas según rol
│   │   ├── data/               etiquetas de categorías, sin catálogo estático
│   │   ├── hooks/              catálogo API, accesibilidad, Mi lista
│   │   ├── lib/                API centralizada, búsqueda y almacenamiento
│   │   ├── pages/admin/        Dashboard, Editor, Preview, Moderation y Users
│   │   ├── pages/              Inicio, Explorar, Detalle y Mi lista
│   │   └── styles/             CSS original + extensión administrativa
│   └── tests/                  pruebas unitarias y navegador
├── server/
│   ├── prisma/                 schema, migración inicial, seed y 16 reseñas
│   ├── scripts/                arranque, limpieza y pruebas PostgreSQL
│   ├── src/                    API, auth, validación, imágenes y errores
│   └── tests/                  validación, imágenes e integración
├── docs/                       informe de implementación y auditoría
├── compose.yaml                PostgreSQL local opcional con Docker
└── render.yaml                 frontend + API + PostgreSQL en Render
```

Prisma y su cliente están fijados a la misma versión 6.12.0 para reproducibilidad y compatibilidad con el schema y las migraciones comprobadas. Los lockfiles de client y server deben conservarse.

## Instalación y base de datos local

Requisitos: Node.js 22 o posterior, npm y PostgreSQL. Docker es opcional. No requiere una base de datos ni servicio pago para desarrollar localmente.

1. Copiar `server/.env.example` a `server/.env` y `client/.env.example` a `client/.env`.
2. Elegir una contraseña PostgreSQL, un secreto JWT aleatorio y las credenciales iniciales del administrador. Configurar Cloudinary para probar subidas reales.
3. Crear una base `entre_lineas` en PostgreSQL (pgAdmin o `CREATE DATABASE entre_lineas;`). Actualizar `DATABASE_URL` con usuario, contraseña y puerto reales. Codificar caracteres especiales de la contraseña si van en la URL.

Alternativa con Docker, desde la raíz, después de completar `POSTGRES_PASSWORD` en `server/.env`:

```sh
docker compose --env-file server/.env up -d
```

El volumen conserva los datos. Cambiar la contraseña del `.env` después de crear el volumen no cambia automáticamente la contraseña de PostgreSQL.

Instalar y aplicar Prisma:

```sh
cd server
npm install
npx prisma format
npx prisma generate
npx prisma migrate dev
npm run seed
npm run dev
```

Para aplicar únicamente las migraciones incluidas, sin crear otras, usar `npx prisma migrate deploy`. `migrate dev` necesita una base local y permisos para crear la shadow database; **no usarlo contra producción**.

En otra terminal:

```sh
cd client
npm install
npm run dev
```

Abrir `http://localhost:5173`. La API local corre en el puerto 3001. Con `VITE_API_URL` vacío, el proxy de desarrollo de Vite envía `/api` al backend. En local, `CLIENT_URL` debe coincidir exactamente con el origen usado para abrir Vite. Si cambia su puerto, actualizar esta variable o liberar 5173.

Para inspeccionar la base: `cd server` y `npx prisma studio`.

## Variables de entorno

| Variable                | Dónde         | Uso                                                                           |
| ----------------------- | ------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`          | server        | Conexión PostgreSQL. Internal URL en Render; External URL desde tu PC         |
| `JWT_SECRET`            | server        | Secreto aleatorio de al menos 32 caracteres; sin valor público predeterminado |
| `CLIENT_URL`            | server        | Origen exacto permitido por CORS, por ejemplo `https://TU-SITIO.onrender.com` |
| `PORT`                  | server        | 3001 en local; Render la proporciona                                          |
| `NODE_ENV`              | server        | `development` en local, `production` en Render                                |
| `CLOUDINARY_CLOUD_NAME` | server        | Nombre del cloud de Cloudinary                                                |
| `CLOUDINARY_API_KEY`    | server        | Clave de Cloudinary, solo backend                                             |
| `CLOUDINARY_API_SECRET` | server        | Secreto de Cloudinary, solo backend                                           |
| `SUPER_ADMIN_NAME`      | server / seed | Nombre del administrador inicial                                              |
| `SUPER_ADMIN_USERNAME`  | server / seed | Username inicial, 3 a 30 letras minúsculas/números/guion bajo                 |
| `SUPER_ADMIN_EMAIL`     | server / seed | Email del administrador inicial                                               |
| `SUPER_ADMIN_PASSWORD`  | server / seed | Contraseña inicial, mínimo 12 caracteres y máximo 72 bytes                    |
| `RUN_MIGRATIONS`        | server        | `true` por defecto; `false` si las migraciones se aplican en otro paso        |
| `POSTGRES_PASSWORD`     | Docker local  | Contraseña usada por `compose.yaml`                                           |
| `VITE_API_URL`          | client        | URL del backend **sin** `/api`, por ejemplo `https://TU-API.onrender.com`     |

Generar un secreto: `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.

No subir `.env`, tokens, contraseñas ni URLs privadas de base de datos a GitHub. Los únicos valores de configuración públicos del cliente deben usar el prefijo `VITE_`; no poner secretos con ese prefijo.

## Administrador inicial y seed

Completá `SUPER_ADMIN_NAME`, `SUPER_ADMIN_USERNAME`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` en `server/.env` y ejecutá `npm run seed` dentro de server, o `npx prisma db seed`.

- No hay credenciales predeterminadas de producción.
- La contraseña se guarda como hash bcrypt de coste 12.
- El seed inserta 16 reseñas publicadas con IDs y slugs originales para conservar los vínculos y las listas de la versión anterior.
- Es idempotente: repetirlo conserva administradores existentes, contraseñas y reseñas editadas; no sobrescribe datos.
- No ejecutarlo como proceso periódico: si borraste una de las obras iniciales, volver a sembrar el catálogo la vuelve a insertar.
- Acceso único: `/login`. Dashboard: `/admin` según rol. Registro público crea exclusivamente USER. `/admin/login` solo redirige al login único.
- Tras crear el admin en producción, retirar `SUPER_ADMIN_PASSWORD` de las variables del servicio y de cualquier equipo donde ya no sea necesaria.
- Cambiar `SUPER_ADMIN_PASSWORD` y repetir el seed **no cambia** la contraseña de un administrador existente. Para una recuperación usar acceso autorizado a la base y un hash nuevo; no existe endpoint público de recuperación.

## Modelos PostgreSQL

**Content:** `id`, `title`, `slug` único, `type` (`BOOK`, `MOVIE`, `GAME`, `SERIES`), `genre`, `year`, `imageUrl`, `imagePublicId`, `synopsis`, `rating`, listas `best` y `worst`, `verdict`, `status` (`DRAFT`, `PUBLISHED`), fechas, `recommended` y `version`.

Campos especializados opcionales en la base: `author/pages`, `director/duration`, `developer/platform`, `creator/seasons`. La API exige solo los correspondientes al tipo elegido y limpia los de otros tipos. Los borradores usan el formulario completo. Cada edición incrementa `version`; una edición sobre una versión antigua devuelve 409 y pide recargar.

**User:** identidad única, perfil, hash bcrypt, rol y estado. **Admin:** archivo histórico con vínculo `migratedUserId`; nunca autentica ni crea sesiones.

**ImageDeletion:** `id`, `publicId` único, `attempts`, `createdAt`. Cola técnica de limpieza remota.

## API REST

| Método | Ruta                            | Acceso                                                |
| ------ | ------------------------------- | ----------------------------------------------------- |
| GET    | `/api/health`                   | Salud de API y conexión PostgreSQL                    |
| GET    | `/api/content`                  | Solo PUBLISHED; filtros `?type=MOVIE&genre=Drama`     |
| GET    | `/api/content/type/:type`       | Solo PUBLISHED de la categoría                        |
| GET    | `/api/content/:slug`            | Detalle publicado; borrador/no existente devuelve 404 |
| POST   | `/api/auth/login`               | `{email,password}`; devuelve JWT y perfil sin hash    |
| GET    | `/api/auth/me`                  | JWT; verifica la sesión                               |
| GET    | `/api/admin/content`            | JWT; todos los estados                                |
| GET    | `/api/admin/content/:id`        | JWT; ficha para editar/previsualizar                  |
| POST   | `/api/admin/content`            | JWT; crea reseña                                      |
| PUT    | `/api/admin/content/:id`        | JWT; edición completa, imagen opcional                |
| PATCH  | `/api/admin/content/:id/status` | JWT; `{status,version}`                               |
| DELETE | `/api/admin/content/:id`        | JWT; `{version}`                                      |

Las rutas protegidas requieren `Authorization: Bearer TOKEN`. Creación y edición admiten `multipart/form-data`: campo `data` con JSON del formulario y campo `image` con un archivo. PUT sin imagen también admite JSON. Para crear, la imagen es obligatoria. No se aceptan URLs o public IDs de imágenes enviados arbitrariamente por el cliente.

Errores centralizados: `{message,fields?}`. Códigos principales: 400 validación, 401 sesión, 403 CORS, 404 no disponible, 409 conflicto de versión, 413 archivo grande, 429 límite de solicitudes, 502/503 proveedor/configuración de imágenes.

CORS autoriza un origen definido por `CLIENT_URL`, no `*`. No sustituye la autenticación. Helmet, límites de JSON/archivos y rate limiting protegen las rutas; login admite diez intentos por IP en quince minutos. Textos tratados como contenido plano y renderizados escapados por React; no se usa `dangerouslySetInnerHTML`.

## Cloudinary

Crear/configurar un cloud y copiar Cloud name, API Key y API Secret desde la consola a las variables **del servidor**. Las subidas usan el SDK Node firmado: no requieren un preset público ni claves en el frontend.

Archivos admitidos: jpg/jpeg/png/webp hasta 5 MB; límite adicional de 25 millones de píxeles, reorientación y reducción a 1600 px, conversión a WebP sin conservar metadatos. Cada nueva imagen usa un public ID propio bajo `entre-lineas/`.

Al editar sin archivo se conserva la imagen. Al reemplazar se confirma primero el cambio en PostgreSQL y luego se elimina la antigua. Si el proveedor está caído, la cola lo reintenta. Al eliminar una reseña ocurre lo mismo. No se usa almacenamiento permanente en el filesystem del backend.

## Render: despliegue exacto

La versión anterior era un único Static Site. Esta versión necesita **tres servicios** y cambiar el Root Directory del frontend existente a `client`. Actualizar esa configuración junto con el despliegue de esta versión.

### 1. PostgreSQL

En Render: **New → Postgres**, nombre `entre-lineas-db`, base `entre_lineas`. Elegir la misma región del backend. Copiar la **Internal Database URL** a `DATABASE_URL` del Web Service.

La base Free de Render expira a los 30 días; sirve para demostraciones. Para conservar una instalación final a largo plazo se necesita un plan persistente apropiado. Ver límites actuales en [Render Free](https://render.com/docs/free).

### 2. Backend

**New → Web Service**, repositorio Dislexia y rama que contenga esta versión:

| Campo             | Valor                                |
| ----------------- | ------------------------------------ |
| Runtime           | Node                                 |
| Root Directory    | `server`                             |
| Build Command     | `npm install && npx prisma generate` |
| Start Command     | `npm start`                          |
| Health Check Path | `/api/health`                        |
| `NODE_ENV`        | `production`                         |
| `NODE_VERSION`    | `22.23.3`                            |

Configurar DATABASE_URL, JWT_SECRET, CLIENT_URL y las tres variables Cloudinary. `CLIENT_URL` debe ser la URL HTTPS del frontend (sin rutas). No configurar PORT manualmente en Render.

`npm start` aplica `prisma migrate deploy` antes de escuchar solicitudes y falla si la migración no se puede aplicar. No crea administradores automáticamente ni recrea reseñas. Alternativamente, aplicar migraciones en un paso de despliegue disponible en tu plan y poner `RUN_MIGRATIONS=false`.

### 3. Seed de producción

Si tu plan dispone de Shell, ejecutar desde el servicio: `npm run seed`, con las cuatro variables SUPER_ADMIN completas. En planes sin Shell, hacerlo desde tu PC: configurar temporalmente en `server/.env` la **External Database URL** de Render (con SSL según la URL proporcionada), las variables SUPER_ADMIN y ejecutar:

```sh
cd server
npx prisma generate
npx prisma migrate deploy
npm run seed
```

Restaurar luego la conexión local. No pegar credenciales en comandos que queden en el historial ni en GitHub. Restringir el acceso externo de la base después de completar este paso si corresponde.

### 4. Frontend

Crear un **Static Site** o actualizar el sitio anterior:

| Campo             | Valor                          |
| ----------------- | ------------------------------ |
| Root Directory    | `client`                       |
| Build Command     | `npm install && npm run build` |
| Publish Directory | `dist`                         |
| `VITE_API_URL`    | `https://TU-API.onrender.com`  |
| `NODE_VERSION`    | `22.23.3`                      |

En Redirects/Rewrites: Source `/*`, Destination `/index.html`, Action **Rewrite**. Las rutas `/admin/login`, `/admin`, `/explorar` y `/resena/:slug` necesitan esa regla.

Los valores Vite se incorporan al build. Cambiar `VITE_API_URL` requiere **rebuild**, no solo reiniciar. Luego comprobar `/api/health`, catálogo, login y subida de una imagen real.

También se incluye `render.yaml` para **New → Blueprint**, con los tres recursos, migraciones al arrancar, rewrite y secretos configurables. Los nombres/URLs finales pueden variar por disponibilidad; completar CLIENT_URL y VITE_API_URL con las URLs realmente asignadas. Aplicar el seed sigue siendo un paso separado.

Referencias oficiales: [Node/Express](https://render.com/docs/deploy-node-express-app), [Static Sites](https://render.com/docs/static-sites), [Monorepos](https://render.com/docs/monorepo-support), [variables](https://render.com/docs/configure-environment-variables), [Prisma Migrate](https://docs.prisma.io/docs/cli/migrate) y [Cloudinary Node](https://cloudinary.com/documentation/node_image_and_video_upload).

## Compilación y pruebas

```sh
cd client
npm run build
npm test
```

```sh
cd server
npx prisma generate
npm test
npm run test:integration
npm run test:stack
```

`test:integration` crea un PostgreSQL real temporal con `embedded-postgres`, aplica la migración, ejecuta el seed dos veces y comprueba la API con Supertest. No usa tu DATABASE_URL ni tu administrador. Puerto de pruebas: 55432; debe estar libre.

`test:stack` agrega pruebas de navegador para la experiencia pública y administrativa. Requiere instalar dependencias de ambas carpetas y Microsoft Edge. En otro sistema configurar `PLAYWRIGHT_CHANNEL` para un canal disponible. Las pruebas dejan capturas en `client/test-results/` y clusters de prueba detenidos en `server/.test-db/`, ambos ignorados por Git. No modifican una base de producción.

Cloudinary se sustituye por un adaptador controlado solo dentro del harness de pruebas; se usa PostgreSQL real y procesamiento real de imágenes. Otra prueba verifica el contrato de llamadas del SDK. La conexión a una cuenta real requiere tus variables y una prueba manual de subida, reemplazo y eliminación.

Para el frontend aislado: `cd client` y `npm run test:e2e`; se simulan respuestas públicas y se omite la prueba del panel real. Para comprobar todo usar `server/npm run test:stack`.

`npm run preview` en client muestra el build; para conectarlo localmente definir `VITE_API_URL` antes de compilar o usar un proxy externo. El proxy de Vite solo aplica a desarrollo.

## Conservación de la experiencia

Fuzzy search (por ejemplo `señor anios`), filtros, cards, reseñas por secciones, accesibilidad y Deshacer siguen disponibles. La clave de Mi lista conserva los IDs originales del seed. Obras eliminadas o pasadas a borrador aparecen como no disponibles con una opción para quitarlas; no rompen la lista ni se eliminan silenciosamente. Las preferencias se guardan con las mismas claves originales.

Cambiar el dominio del sitio cambia el origen de localStorage: las preferencias de otro dominio no se transfieren automáticamente.

## GitHub y pasos pendientes

No subir secretos ni `node_modules`, `dist` o las bases de pruebas. Revisar los cambios y publicarlos en una rama; preparar primero la configuración Render para la nueva estructura.

El código no provisiona cuentas externas. Para desplegar faltan tus variables PostgreSQL/Cloudinary/admin, los servicios Render y el seed de producción. [Informe detallado de auditoría](docs/IMPLEMENTACION.md).

## Usuarios y comunidad

La ampliación conserva el catálogo editorial, panel administrativo, Cloudinary y Mi lista. Los usuarios tienen registro, sesión JWT de dos horas en sessionStorage, perfil editable y avatar validado con el mismo flujo de imágenes del catálogo. Existe una sola sesión con audiencia `entre-lineas-session`. Todos los roles usan el mismo perfil y token.

Cada contenido publicado tiene comunidad con una reseña por usuario, puntuación de 1 a 5, spoilers ocultos hasta abrirlos, respuestas sin anidamiento, votos Útil persistentes e idempotentes, reportes y paginación. Las publicaciones propias se editan y eliminan lógicamente. Las publicaciones moderadas no pueden restaurarse desde una cuenta normal.

`/admin/comunidad` contiene Reseñas, Respuestas y Reportes. Permite ocultar, restaurar, eliminar lógicamente y resolver reportes. Las cuentas se administran exclusivamente desde `/admin/users` con controles de jerarquía. Los estados se comprueban en cada solicitud: suspender o bloquear también restringe tokens emitidos previamente. Las reseñas existentes se conservan al suspender usuarios; la moderación de publicaciones se realiza por separado. Si un contenido editorial tiene comunidad, su eliminación física se rechaza: puede pasarse a borrador conservando el historial.

Preferencias de accesibilidad: visitantes siguen usando localStorage; las cuentas cargan y guardan sus ajustes en PostgreSQL. Mi lista conserva su implementación local para evitar cambios de sincronización y sigue funcionando para visitantes y usuarios.

### Rutas nuevas

- `/register`, `/login`, `/profile/:username`, `/admin/comunidad`.
- `POST /api/users/register`, `POST /api/users/login`, `GET /api/users/me`, `PUT /api/users/me` (JSON o multipart, imagen en `image`).
- `GET /api/users/:username`, `GET/PUT /api/users/me/accessibility`.
- `GET/POST /api/content/:contentId/reviews` (ID de contenido, no slug).
- `PUT/DELETE /api/reviews/:id`, `GET/POST /api/reviews/:id/replies`.
- `PUT/DELETE /api/replies/:id`, `POST/DELETE /api/reviews/:id/helpful`, `POST /api/reports`.
- `GET /api/admin/community/{reviews,replies,reports}`, `PATCH /api/admin/community/{recurso}/:id` con `{status}`.

Los listados usan `page`, las reseñas públicas admiten `order=recent|rating|helpful|oldest` y `rating=1..5`, y los listados de moderación `q`. No se devuelve email ni hash de contraseñas en perfiles públicos. El backend valida longitud, formato, HTML, autoría y restricciones; registro/login/publicaciones/reportes tienen límites de solicitudes.

### Migración y datos ficticios

La migración `20261006010000_community` agrega tablas y constraints sin reemplazar las existentes. Ejecutar `npm --prefix server run prisma:generate` y `npm --prefix server run migrate:deploy` antes de usar la ampliación; `npm start` también aplica migraciones como antes. La actualización de roles se describe en INFORME-USUARIOS-ROLES.md; las variables SUPER_ADMIN_* solo se necesitan para bootstrap de una instalación nueva.

Solo en desarrollo: `NODE_ENV=development`, `SEED_COMMUNITY=true` y `DEMO_USER_PASSWORD` (mínimo 12 caracteres, máximo 72 bytes) habilitan dos cuentas ficticias (`lectora_demo@example.test`, `cinefilo_demo@example.test`) y sus opiniones al ejecutar el seed. El password lo define quien ejecuta el seed y no se publica ni se fija en código. Producción nunca crea estos usuarios.

### Verificación

`npm test`: pruebas unitarias existentes. `npm --prefix server run test:integration`: PostgreSQL real temporal, migraciones, catálogo, comunidad, autoría, separación de roles, estados, votos y preferencias. `npm --prefix server run test:stack`: agrega el navegador Edge con registro, edición, spoilers, respuestas, reportes, perfiles, sesiones, moderación y vistas de 375/768/1440 px.
