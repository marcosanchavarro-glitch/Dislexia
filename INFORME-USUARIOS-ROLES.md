# Sistema unificado de usuarios, roles y administración

Implementación sobre la aplicación existente. Se mantienen diseño, catálogo, comunidad, imágenes, accesibilidad y Mi lista. Esta entrega modifica el código local; todavía no se aplicó a PostgreSQL ni a los servicios de Render de producción.

## Auditoría inicial

Había un modelo Admin, otro User, dos contextos con estado independiente, dos claves de sessionStorage y JWT con audiencias diferentes. `/api/auth/login` autenticaba Admin, mientras `/api/users/login` autenticaba User. La moderación de reseñas/respuestas ya modificaba solo su publicación; las cuentas tenían una operación aparte. Se conserva esa separación y se añaden jerarquías, controles transaccionales y auditoría.

## Identidad y sesión

User conserva id, username, email, passwordHash, avatarUrl/avatarPublicId, bio, status, fechas, relaciones y preferencias. Agrega name opcional, role y relaciones con contenidos editoriales y AdminAuditLog. Los roles son USER, EDITOR, ADMIN y SUPER_ADMIN; los estados ACTIVE, SUSPENDED y BANNED.

UserProvider es el único contexto con estado de autenticación. useAuth es un adaptador del mismo contexto para las páginas editoriales existentes, sin otra sesión. Se guarda un único token en `entre-lineas-session`. Los nombres auxiliares getUserToken/setUserToken apuntan a las mismas funciones y almacenamiento, sin un segundo token.

JWT HS256, dos horas, issuer entre-lineas-api y audiencia entre-lineas-session: identifica al User mediante sub. El rol y estado se consultan en PostgreSQL en cada solicitud. Un claim de rol falsificado no modifica permisos. Se rechazan ambas audiencias anteriores y el cliente retira las claves antiguas; después de actualizar hay que iniciar sesión nuevamente. `/admin/login` redirige a `/login`; no hay formulario administrativo separado. Salir desde el header o el panel borra la misma sesión. Respuestas antiguas de solicitudes de sesión no pueden restaurar una cuenta después de cerrar sesión o reemplazar una sesión nueva.

## Matriz de permisos

| Acción                                                          | USER      | EDITOR    | ADMIN     | SUPER_ADMIN |
| --------------------------------------------------------------- | --------- | --------- | --------- | ----------- |
| Perfil, lista, búsqueda y accesibilidad                         | Sí        | Sí        | Sí        | Sí          |
| Comunidad propia, responder, votar y reportar                   | Si ACTIVE | Si ACTIVE | Si ACTIVE | Si ACTIVE   |
| Catálogo privado, crear/editar, imágenes, borradores y publicar | No        | Si ACTIVE | Si ACTIVE | Si ACTIVE   |
| Eliminar contenido editorial                                    | No        | No        | Si ACTIVE | Si ACTIVE   |
| Moderar reseñas/respuestas y resolver reportes                  | No        | No        | Si ACTIVE | Si ACTIVE   |
| Buscar/ver usuarios y actividad                                 | No        | No        | Si ACTIVE | Si ACTIVE   |
| Cambiar rol/estado de USER, EDITOR o ADMIN ajenos               | No        | No        | Sí        | Sí          |
| Otorgar/quitar SUPER_ADMIN o administrar otro SUPER_ADMIN       | No        | No        | No        | Sí          |
| Cambiar su propio rol o estado                                  | No        | No        | No        | No          |

No se introducen configuraciones críticas nuevas: las configuraciones técnicas continúan en variables privadas del servidor. El panel se adapta al rol y el servidor protege cada endpoint. Los permisos reutilizables están en auth.js: authMiddleware, requireActive, requireRole, requireMinimumRole y canManageUser.

## Migración segura

`20261008000000_unified_roles/migration.sql` ejecuta cambios dentro de una transacción PostgreSQL:

1. Agrega enum Role y columnas de User sin borrar tablas anteriores.
2. Por cada Admin, busca User con el mismo email ignorando mayúsculas. Si existe, conserva su id, hash de contraseña, perfil, imágenes, status, preferencias y actividad; asigna SUPER_ADMIN y completa name si faltaba. Si hay varias coincidencias, aborta para que se resuelva la ambigüedad antes de migrar.
3. Si no existe User, crea uno con id `legacy_` más el id anterior, username determinista `admin_` más un hash del id con resolución de colisiones, email normalizado, hash y fechas anteriores, role SUPER_ADMIN y status ACTIVE. El username puede cambiarse luego desde su perfil.
4. Conserva Admin como archivo histórico y registra `migratedUserId` con referencia restrictiva a User. Admin deja de participar en cualquier autenticación.
5. Agrega Content.createdByUserId. Las nuevas publicaciones registran su creador. El contenido anterior conserva autoría técnica null: no se inventa quién lo creó.
6. Crea AdminAuditLog con referencias restrictivas al actor y usuario objetivo, action, metadata y fecha.

En una coincidencia de email, el password de User prevalece: la antigua contraseña administrativa separada deja de autenticar. La cuenta no se duplica y su actividad se conserva. Si la cuenta coincidente estaba suspendida/baneada, se conserva ese estado; revisar propietarios activos antes de actualizar. No se borra ni recrea la base. No se debe usar migrate reset ni db push para desplegar.

## Usuarios y moderación

`/admin/users`: cards con avatar, username, email, badges textuales de rol/estado, fechas y cantidades de reseñas, respuestas, reportes y contenido editorial. Búsqueda por username/email, filtros por rol/estado y paginación de 20 usuarios.

`/admin/users/:id`: perfil completo, actividad reciente, publicaciones editoriales e historial de acciones. El listado indica la cantidad total de actividad; la ficha muestra las últimas 20 publicaciones de cada tipo y 30 eventos. Solo se ofrecen acciones permitidas para la cuenta seleccionada. Se puede cambiar rol, suspender, banear o reactivar con un modal nativo accesible, sin window.confirm.

Banear presenta: “El usuario perderá la posibilidad de publicar contenido e iniciar acciones de comunidad mientras permanezca baneado.” BANNED también impide nuevos logins. SUSPENDED permite login/consulta, pero rechaza publicación, edición, votos, respuestas, reportes y administración. La suspensión dura hasta que un administrador reactive la cuenta; no se agrega una duración automática no solicitada. Los tokens emitidos antes de un cambio no evitan las restricciones.

Ocultar/eliminar lógicamente reseñas o respuestas no cambia estado ni rol del autor. Las cuentas pueden seguir publicando en otros contenidos o respondiendo según las reglas existentes. Se mantiene una reseña por persona y contenido, y un autor no puede restaurar su propia publicación moderada.

## Protección y auditoría

Los cambios de cuenta usan una transacción con bloqueo advisory PostgreSQL común. Dentro del bloqueo se vuelven a leer actor/objetivo y permisos actuales: dos propietarios no pueden quitarse privilegios simultáneamente dejando al sistema sin propietario. Se rechaza cambiar el propio rol/estado, administrar SUPER_ADMIN desde ADMIN, asignar SUPER_ADMIN desde ADMIN y retirar/suspender/banear al último SUPER_ADMIN activo. No hay endpoint de eliminación física de usuarios.

La acción y su auditoría se guardan atómicamente. Se registran ROLE_CHANGED (rol anterior/nuevo), USER_SUSPENDED, USER_BANNED, USER_REACTIVATED, COMMUNITY_REVIEW_HIDDEN y COMMUNITY_REPLY_HIDDEN; también restauraciones, eliminación lógica y actualización de reportes. La metadata contiene recurso y estados, nunca contraseñas/tokens. Los intentos rechazados no cambian datos ni crean una auditoría de éxito.

## API nueva o modificada

| Método/ruta                                               | Contrato y permiso                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| POST /api/auth/register                                   | Crea exclusivamente USER; registro rechaza campos de privilegios         |
| POST /api/auth/login                                      | User por email/password; retorna `{token,user}` con rol/estado, sin hash |
| GET /api/auth/me                                          | Identidad única actual, rol, estado y preferencias                       |
| /api/users/register, /api/users/login, /api/users/me      | Alias de la misma identidad, mantenidos para compatibilidad              |
| GET /api/admin/users                                      | ADMIN+; q, role, status, page; `{items,total,page}`                      |
| GET /api/admin/users/:id                                  | ADMIN+; perfil privado, actividad y auditoría                            |
| PATCH /api/admin/users/:id/role                           | `{role}`; jerarquía y protección del propietario                         |
| PATCH /api/admin/users/:id/status                         | `{status}`; operación independiente de publicaciones                     |
| GET/POST/PUT/PATCH /api/admin/content…                    | EDITOR+ activo; creación registra creador                                |
| DELETE /api/admin/content/:id                             | ADMIN+ activo; conserva la protección de contenido con comunidad         |
| GET/PATCH /api/admin/community/{reviews,replies,reports}… | ADMIN+ activo; ahora registra auditoría                                  |

Se retira `/api/admin/community/users`: no queda una ruta alternativa que evada la jerarquía. Las rutas y operaciones públicas de comunidad/perfil/accesibilidad se conservan, pero autentican la misma sesión.

## Bootstrap y variables

Para una instalación nueva: SUPER_ADMIN_NAME, SUPER_ADMIN_USERNAME (3–30 letras/números/guion bajo), SUPER_ADMIN_EMAIL y SUPER_ADMIN_PASSWORD (mínimo 12 caracteres, máximo 72 bytes). El seed crea User SUPER_ADMIN/ACTIVE con bcrypt coste 12. Es idempotente y nunca resetea contraseñas ni eleva una cuenta normal existente. Si ese email pertenece a un USER, la promoción debe hacerse desde otro Super Admin. No hay credenciales hardcodeadas.

Para actualizar esta instalación con Admin existentes **no hace falta crear credenciales nuevas ni ejecutar seed**: la migración conserva el acceso administrativo según la estrategia anterior. ADMIN_NAME/EMAIL/PASSWORD ya no se utilizan. DATABASE_URL, JWT_SECRET, CLIENT_URL, Cloudinary y VITE_API_URL se conservan. Los antiguos valores de bootstrap pueden retirarse tras comprobar el acceso y guardar una copia de recuperación privada.

## Actualizar Render

1. Obtener una copia de seguridad de PostgreSQL y confirmar que al menos un administrador migrado quedará ACTIVE. Mantener acceso de recuperación a Render/base. Identificar emails compartidos antes del despliegue por el cambio de contraseña descrito.
2. Subir esta revisión a la rama de despliegue `codex/full-stack`. Actualizar primero entre-lineas-api: root server, build `npm install && npx prisma generate`, start `npm start`, health `/api/health`. El arranque aplica la nueva migración. No volver a usar el start temporal con seed.
3. Confirmar migración exitosa y `/api/health` con status ok. Iniciar sesión por `/api/auth/login` con la cuenta migrada y comprobar role SUPER_ADMIN.
4. Actualizar Dislexia: rama codex/full-stack, root client, build `npm ci && npm run build`, publish dist, VITE_API_URL igual al backend actual y rewrite `/*` → `/index.html`.
5. Recargar, iniciar sesión en `/login` y comprobar perfil/comunidad/panel/Usuarios y logout. Las sesiones anteriores caducan por el cambio de audiencia.
6. En una actualización coordinada, suspender temporalmente auto-deploy del frontend mientras se verifica backend, porque la rama compartida puede desplegar ambos a la vez. Durante la ventana de actualización el cliente anterior requiere recargar: el backend deja de aceptar la audiencia anterior y el contrato de login devuelve user.

Nunca retroceder solo el backend a la autenticación Admin archivada: revertir código/datos requiere una estrategia coordinada, ya que eso reactivaría permisos anteriores. La migración es aditiva, pero no se declara una reversión automática segura de cuentas.

## Verificación

Resultado del 8 de octubre de 2026: Prisma format y generate correctos; 8 pruebas unitarias backend y 3 frontend aprobadas; migración e integración PostgreSQL aprobadas; los 10 flujos Edge aprobados; build final Vite correcto. La verificación visual de la ficha conserva las cards, tipografía y colores existentes. Los artefactos están en client/test-results (ignorados por Git).

Comandos: Prisma format/generate; npm --prefix server test; npm --prefix client test; npm --prefix server run test:stack; npm --prefix client run build.

La suite aplica primero las dos migraciones antiguas en PostgreSQL temporal, inserta Admin separados y un Admin con email coincidente con un User con avatar/preferencias/reseña/respuesta, aplica la nueva migración y comprueba preservación de hashes y actividad. Repite seed y comprueba que no cambia el hash.

Las pruebas API cubren los 12 casos solicitados (logout se verifica en navegador), creación con EDITOR, denegación de USER/EDITOR, moderación sin ban, ban/suspensión con tokens vigentes, promociones USER→EDITOR→ADMIN, protección de SUPER_ADMIN, autogestión rechazada, claims falsificados, audiencias antiguas, filtros y auditoría. Dos Super Admin intentan quitarse rol simultáneamente: solo una operación puede completarse.

Las pruebas Edge cubren panel editorial/CRUD, comunidad/perfil/preferencias, adaptación por rol, gestión de Usuarios, modal de ban/cancelación/reactivación, una sola clave de sesión y cierre completo. Verifican 375/768/1440 px sin desbordamientos. Cloudinary se simula en integración; no se modifican cuentas ni imágenes de producción para estas pruebas.
