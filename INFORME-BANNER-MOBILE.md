# Corrección del banner y composición móvil — 8 de octubre de 2026

## Banner

El componente anterior `client/src/pages/Home.jsx` tenía tres imágenes hardcodeadas: `/covers/dune.svg`, `/covers/interestelar.svg` y `/covers/zelda.svg`. No consultaba las imágenes de los libros del catálogo.

Ahora reutiliza `GET /api/content`, a través de `useContent`, sin crear endpoints. `selectHeroBooks` filtra libros publicados con slug y URL HTTP/HTTPS válida; prioriza recomendados, conserva el orden del endpoint y selecciona tres. Cada portada enlaza a su reseña. Los archivos anteriores se usan únicamente para posiciones faltantes. Una imagen que falla se excluye y se busca la siguiente elegible. Con tres portadas válidas no aparece ninguna demo.

El catálogo se solicita sin caché del navegador. Se vuelve a consultar al regresar a Inicio, al recuperar el foco en Inicio y tras los cambios del panel que ya invocaban `reload`.

Libros reales que devuelve la API de producción y que corresponden a las tres posiciones:

| Libro | imageUrl |
| --- | --- |
| El Señor de los Anillos: La comunidad del anillo (recomendado) | https://res.cloudinary.com/etufdcye/image/upload/v1791324665/entre-lineas/af7b9ecb-9cb1-42b4-957a-ac340f0fd155.webp |
| Dune | https://res.cloudinary.com/etufdcye/image/upload/v1791325180/entre-lineas/13ff4906-4680-46c5-a521-3baee879db16.webp |
| El principito | https://res.cloudinary.com/etufdcye/image/upload/v1791324763/entre-lineas/5a34b546-9977-4e82-859d-8b77ef847945.webp |

La prueba funcional usa PostgreSQL real aislado: crea tres libros mediante el API editorial, los publica, compara sus imageUrl con los img de Home, abre una reseña, reemplaza la portada mediante PUT y vuelve a Inicio para comprobar el nuevo src. Las imágenes de esa prueba usan un transporte simulado; no se modificaron las portadas de producción.

## Composición móvil

El header anterior mezclaba flex-wrap y órdenes distintos: la cuenta quedaba en una fila imprevisible. El loading heredaba 70 px de padding vertical y un margen de párrafo. Las vistas tenían mínimos de altura y el footer conservaba separaciones de escritorio.

En `responsive.css`, hasta 600 px el header tiene filas explícitas: marca/accesibilidad, cuenta, navegación y búsqueda. Usa el mismo gutter que main: 16 px y 20 px desde 390 px. La navegación se centra como grupo y mantiene el contador junto a Mi lista. Loading, mínimos de altura, márgenes de secciones y footer se ajustan solo en móvil. El título con texto máximo hasta 360 px sigue ampliado, pero permite conservar las palabras completas.

Escritorio: comparación a 1440 px con la versión anterior publicada. Coordenadas y dimensiones de marca, header, navegación, búsqueda, hero, texto, escena y tres portadas resultaron idénticas. Se conservan posiciones, rotaciones, sombras y proporciones del banner.

## Validación

- 15 pruebas unitarias aprobadas en el workspace.
- Stack completo con PostgreSQL: migraciones, preservación, API, permisos, comunidad y 15 pruebas de navegador aprobadas; incluye las pruebas locales de recuperación pendientes.
- 14.688 combinaciones de vistas/ancho/modo aprobadas, más los casos específicos del banner.
- Anchos: 320, 360, 375, 390, 414, 430, 768 y 1440 px. Capturas completas de 320/390/430, capturas de viewport/footer y 320 con modo máximo F revisadas visualmente.
- La copia exacta preparada para publicación, sin la recuperación pendiente, compiló y pasó las dos pruebas de banner/composición sin backend. Bundle: CSS `index-DfMn7lg-.css`, JS `index-BX-BgpE5.js`.

Archivos principales: Home.jsx, heroBooks.js, useContent.js, Header.jsx, ApiState.jsx, responsive.css. Pruebas: core.test.js, hero-mobile.spec.js y el transporte/aislamiento de las suites en test-stack.js.

Las capturas están en `client/test-results` y `.test-artifacts/publication/client/test-results`; están excluidas de Git. El resultado de comparación está en `client/test-results/desktop-comparison.json`.

## Publicación

Servicio existente: https://dislexia-v1ho.onrender.com/ — rama `codex/full-stack`; API pública existente: https://entre-lineas-api.onrender.com. Se publica únicamente esta corrección de banner/móvil. La recuperación de contraseña permanece local hasta configurar su proveedor de email.
