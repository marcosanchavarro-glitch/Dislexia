# Revisión móvil — 11 de octubre de 2026

El pedido repetía los problemas de la primera composición. La grilla, gutters y loading compacto ya existían; esta revisión corrige los espacios y saltos que todavía hacían demasiado alta la versión móvil.

## Causas y cambios

- Header: enlaces de cuenta con mínimo de 44 px y navegación de 44 px añadían altura a cuatro filas. En móvil los enlaces de cuenta pasan a 36 px y navegación a 40 px, con altura natural cuando aumenta el texto. Se mantienen áreas explícitas, logo/accesibilidad alineados y separación de 8 px entre filas. Header visitante: 214 px, frente a 226 px anteriores.
- Hero: salto de línea fijo de escritorio, padding interior de 28 px y título grande producían demasiadas líneas a 320 px. En móvil el título fluye, usa 2.1 rem y escala con la configuración de texto del usuario; el padding es 24 px vertical. Se conserva el diseño de las tres portadas, escena, colores y sombras.
- Espacio duplicado: el botón del hero tenía 24 px de margen superior, además del espacio después del párrafo. Se elimina ese margen móvil y se deja una separación única de 20 px.
- Loading: se verificó que usa su bloque compacto de 88 px, sin heredar la altura del hero. Footer: mantiene 20 px de separación y márgenes comunes; no se introdujo altura de viewport.
- Alineación: header, buscador, main y footer comparten gutters de 16 px y 20 px desde 390 px. Navegación centrada como grupo; contador junto a Mi lista. No hay width:100vw en los estilos.

No se aplica text-align:center global. Los cambios de CSS están limitados a max-width:600px.

## Validación

Frontend levantado con Vite. Capturas completas generadas y revisadas a 320, 390 y 430 px; revisión adicional del viewport, footer y cuenta Super Admin autenticada. Configuración máxima F a 320 px: palabras completas, navegación con wrap y dimensiones naturales. Imágenes lazy-loaded se cargaron recorriendo toda la página antes de la captura completa.

36 configuraciones en 320/360/375/390/414/430/768/1440: 288 comprobaciones de Home. Además se comprueban alineación vertical del logo/accesibilidad, orden de filas, gutters y altura compacta del header. Tres pruebas de navegador aprobaron; la prueba PostgreSQL de reemplazo de portada se omitió porque esta corrección no cambia esa funcionalidad. Cinco pruebas unitarias del cliente aprobaron. Build de la copia exacta preparada para publicación aprobado.

Escritorio 1440 px: comparación con el sitio publicado mostró coordenadas y dimensiones idénticas para header, marca, nav, búsqueda, hero, texto, escena y las tres portadas. Tablet 768 px verificada en la matriz y captura; las nuevas reglas no aplican a tablet.

Archivos: client/src/styles/responsive.css, client/src/pages/Home.jsx y client/tests/browser/hero-mobile.spec.js.

Evidencia local: client/test-results/mobile-composition-320.png, mobile-composition-390.png, mobile-composition-430.png; mobile-top-320-F.png; mobile-loading-320.png; mobile-auth-320.png; desktop-comparison.json. Los resultados están excluidos de Git.
