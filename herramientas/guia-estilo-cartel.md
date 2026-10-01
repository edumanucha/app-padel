# Guía de estilo "Cartel de estadio" — Padelito

Identidad visual de la app desde el 2026-10-01 (elegida por el usuario en `/pruebas-rediseno`, "me encantó el nuevo estilo, un 10"). El modelo de referencia es el **Inicio**: `app/frontend/src/components/HomeForm.js`, desde el comentario `{/* 1. Saludo (rediseño paso C` hasta `{/* 5. Último partido jugado`.

## Principios

1. **Una protagonista por pantalla.** El dato o la acción más importante va en un bloque **verde tablero** (`bg-[#154139] text-[#eaf4f0]`, `rounded-[6px]`), con etiqueta chica en `text-[#8fb6ae]` y el dato grande en `font-titulo`. Puede llevar un acento amarillo (`bg-accent text-accent-ink`), como la fecha del próximo partido.
2. **Un solo botón amarillo por pantalla** (`bg-accent text-accent-ink rounded-[6px]`, texto en `font-titulo font-black uppercase`, grande). El resto de las acciones son livianas: fila con líneas (`border-y-2 border-ink` y divisor `border-l-2 border-ink`), botón de texto con ícono, o botón con contorno fino (`border border-ink/15 rounded-[6px]`).
3. **Líneas antes que cajas.** Las listas son filas separadas por `border-b border-ink/10`, no tarjetas una debajo de otra. Usá tarjeta (`bg-surface border border-ink/10 rounded-[8px]`) solo si un bloque realmente necesita separarse.
4. **Números grandes.** Puntos, puestos, resultados, porcentajes, horas: `font-titulo font-black text-[2.2rem]–[2.6rem] leading-none`, con etiqueta abajo `text-[10px] font-bold uppercase tracking-[0.1em] text-muted`. Varios números juntos: grilla con divisores `border-l border-ink/15 pl-3`.
5. **Etiquetas de sección**: `text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted`.
6. **Títulos de pantalla** (ya aplicados): `font-titulo text-4xl font-black uppercase leading-[0.95]`. Títulos de bloque: `font-titulo font-extrabold uppercase text-2xl leading-none`.
7. **Sin emojis.** Íconos de línea de `@/components/Icons` (con `className="ico"` dentro de un texto). Se permiten ✕ y ✓.
8. **Formas:** esquinas `rounded-[6px]`/`rounded-[8px]`, nada de píldoras (`rounded-full` solo para círculos: avatares, puntos, contadores, interruptores). Sin sombras.
9. **Colores:** solo los tokens (`bg`, `surface`, `ink`, `muted`, `accent`, `accent-ink`, `accent-2*`, `accent-3*`, `outline`) y el verde tablero `#154139` / `#0f2e29` con textos `#eaf4f0`, `#8fb6ae`, `#c4dad3`. Tiene que verse bien en modo claro y oscuro (`text-ink`/`bg-surface` cambian solos; el verde tablero queda igual).
10. **Botón "Volver"** del encabezado: `text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink` (sin fondo).

## Reglas de trabajo

- Cambiá **solo el JSX y las clases**. No toques lógica, estados, consultas a Supabase, handlers, rutas, `data-guia`, ni textos/claves de `t(...)`.
- **No edites** `i18n/translations.js`, `Icons.js`, `HojaAbajo.js`, `globals.css`, `HomeForm.js` ni archivos de otros grupos. Si necesitás un texto o un ícono que no existe, usá uno existente o dejalo como está y avisalo en tu reporte.
- Mantené los comentarios existentes que expliquen decisiones; sumá un comentario corto `// Rediseño Cartel (2026-10-01): ...` donde cambies la estructura.
- Escribí en español rioplatense (voseo) si agregás comentarios.
- Probá con `npx eslint <tus archivos>` desde `app/frontend` (no corras `next build` ni git: lo hace el coordinador). No sumes errores de lint nuevos.
