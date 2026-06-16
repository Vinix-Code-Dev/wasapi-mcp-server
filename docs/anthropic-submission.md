# Envío al Connectors Directory de Claude — checklist

**Formulario (desktop extensions / MCPB):** https://clau.de/desktop-extention-submission

## Datos para el formulario
- **Nombre:** Wasapi
- **Paquete npm:** `@wasapi/mcp-server`
- **Repo:** https://github.com/Vinix-Code-Dev/wasapi-mcp-server
- **Artefacto `.mcpb`:** adjuntar `wasapi-mcp.mcpb` del release más reciente
  → https://github.com/Vinix-Code-Dev/wasapi-mcp-server/releases/latest/download/wasapi-mcp.mcpb
- **Descripción:** Gestiona tu cuenta de WhatsApp Business en Wasapi desde Claude: contactos, mensajes, plantillas, WhatsApp Flows, campañas, embudos, métricas, reportes y más (62 herramientas).
- **Política de privacidad:** https://www.wasapi.io/org/politica-de-privacidad
- **Soporte:** https://github.com/Vinix-Code-Dev/wasapi-mcp-server/issues

## Requisitos cumplidos (auto-checklist)
- [x] Todas las tools con `title` + `readOnlyHint`/`destructiveHint` en `tools/list` (ver `src/lib/tool-annotations.ts`; 40 read / 22 write)
- [x] Tools granulares — sin "catch-all" que mezcle lectura y escritura
- [x] Descripciones factuales, sin instrucciones al modelo ni texto promocional
- [x] `privacy_policies` en el manifest + sección **Privacidad** en el README
- [x] Documentación: instalación, autenticación, ≥3 prompts de ejemplo, limitaciones conocidas, canal de soporte
- [x] `manifest_version` 0.3 · versión del server = versión del manifest (1.1.0)
- [x] `.mcpb` empacado con la CLI oficial (`@anthropic-ai/mcpb`) — ZIP válido

## Lo que debes proveer al reviewer
- Una **API key de prueba de Wasapi con datos de ejemplo** (algunos contactos, una conversación, alguna plantilla/etiqueta) para que puedan ejercitar las herramientas.
- Confirmar que el `.mcpb` adjunto corresponde a la versión publicada en npm (`@wasapi/mcp-server@1.1.0`).

## Razones comunes de rechazo (ya mitigadas)
- ❌ Tools sin título o sin anotación de seguridad → ✅ cubierto
- ❌ Métodos seguros + inseguros en una sola tool → ✅ tools separadas
- ❌ Descripciones vagas/promocionales → ✅ factuales
- ❌ Respuestas enormes sin paginación → la mayoría de listados aceptan `page`/`per_page`/`cursor`
- ❌ Política de privacidad incompleta → ✅ cubre recolección, uso, almacenamiento, terceros y contacto
- ❌ Cuenta de prueba sin datos → proveer key con datos de ejemplo
