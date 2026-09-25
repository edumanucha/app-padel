# Sincronización local del proyecto

Los documentos de la base de conocimiento de este Proyecto se replican en la computadora de Eduardo, en:

`C:\Users\Eduardo Manucha\Desktop\QA\ProyectoPersonal\QA Automation & Desarrollo — App Padel\`

**Cómo funciona:** cuando una sesión de Claude vinculada a esta computadora (vía el puente de dispositivo) crea o actualiza un documento del proyecto, lo escribe también como archivo `.md` en esa carpeta, con el mismo nombre, sin que Eduardo tenga que pedirlo cada vez. Esto incluye los documentos escritos desde cualquier chat del proyecto ("Crear la app", "Diseño QA", "Automatización", etc.), no solo los de un chat puntual.

**Límite a tener en cuenta:** esto requiere que la sesión activa tenga la computadora vinculada (Claude desktop app abierta, carpeta conectada). Si una sesión nueva no tiene el vínculo activo todavía, hay que conectarlo primero (la app puede pedir aprobación) antes de que la sincronización funcione en esa sesión. Este documento sirve para que cualquier sesión que lea la base de conocimiento sepa que existe este espejo local y dónde está.

## Versión Word (.docx) de historias de usuario y casos de prueba

**Decisión (2026-08-29, a pedido del usuario):** además del `.md` (que sigue siendo la fuente de verdad que lee y edita Claude en todos los chats), `historias-usuario-mvp.md` y las 5 matrices `casos-prueba-epicaX.md` también se generan como **Word (.docx)**, para que Eduardo los lea cómodamente fuera de Claude, con historias y casos de prueba de cada épica combinados en un solo documento con formato (encabezados, tablas reales, texto en negrita donde corresponde).

**Ubicación:** subcarpeta `Épicas\` dentro de la carpeta del proyecto, con una carpeta por épica:

```
QA Automation & Desarrollo — App Padel\
  Épicas\
    Épica 1 - Autenticación y Perfil\
      Épica 1 - Autenticación y Perfil.docx
    Épica 2 - Gestión de Partidos\
      Épica 2 - Gestión de Partidos.docx
    Épica 3 - Valoración y Ranking\
      Épica 3 - Valoración y Ranking.docx
    Épica 4 - Directorio de Canchas\
      Épica 4 - Directorio de Canchas.docx
    Épica 5 - Navegación de Funcionalidades Futuras\
      Épica 5 - Navegación de Funcionalidades Futuras.docx
```

**Regla de sincronización:** cada vez que cambie el contenido de `historias-usuario-mvp.md` o de la matriz `casos-prueba-epicaX.md` de una épica puntual (una historia nueva, un criterio ajustado, un caso de prueba agregado o corregido), hay que regenerar también el `.docx` de esa épica y volver a comitearlo a su carpeta. El `.md` manda siempre — el `.docx` es una vista de lectura derivada, nunca se edita a mano ni se toma como fuente.

**Cómo se genera (para la sesión que lo regenere):** se arma con la librería `docx` de Node (no a mano, no copiando el markdown tal cual) — un script toma el contenido de la épica y produce el documento con encabezados reales, listas con viñetas y tablas de ancho fijo para los casos de prueba (ID / Título / Precondición / Pasos / Resultado esperado / Tipo / Prioridad). Conviene, antes de generarlo, convertirlo a PDF y mirar una página para confirmar que se ve bien (tablas, negrita, sin texto cortado) antes de mandarlo.

**Última generación completa:** 2026-08-29 — las 5 épicas del MVP (70 casos de prueba en total).
