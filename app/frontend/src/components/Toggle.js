// Switch on/off compartido (2026-09-13, a pedido del usuario: "todo lo que
// sea seleccionable sea mediante toggles" -- antes cada preferencia booleana
// tenía su propio botón/pill que cambiaba de texto, ahora un solo switch
// visual consistente). Extraído de MarcadorForm.js (punto de oro / súper
// tie-break), que ya lo tenía afinado -- ver comentario sobre el centrado
// del círculo.
export default function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
      style={{
        width: 40,
        height: 24,
        borderRadius: 999,
        background: checked ? "var(--accent)" : "var(--bg)",
        border: "2px solid var(--outline)",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
        padding: 2,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: checked ? "var(--accent-ink)" : "var(--muted)",
        }}
      />
    </button>
  );
}
