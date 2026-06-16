# Wasapi MCP Server

[![npm version](https://img.shields.io/npm/v/@wasapi/mcp-server.svg)](https://www.npmjs.com/package/@wasapi/mcp-server)
[![license](https://img.shields.io/npm/l/@wasapi/mcp-server.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/@wasapi/mcp-server.svg)](https://nodejs.org)

Servidor MCP para [Wasapi](https://wasapi.io). Gestiona tu cuenta de WhatsApp Business directamente desde Claude, Cursor o cualquier cliente compatible con MCP: envía mensajes, administra contactos y consulta conversaciones usando lenguaje natural.

---

## Tabla de contenidos

- [Instalación](#instalación)
  - [Opción 1 — Claude Desktop, sin terminal](#opción-1--claude-desktop-sin-terminal)
  - [Opción 2 — Asistente de configuración (recomendada para developers)](#opción-2--asistente-de-configuración-recomendada-para-developers)
  - [Opción 3 — Configuración manual](#opción-3--configuración-manual)
- [¿Qué puedo hacer?](#qué-puedo-hacer)
- [Clientes compatibles](#clientes-compatibles)
- [Referencia del asistente (`setup`)](#referencia-del-asistente-setup)
- [Variables de entorno](#variables-de-entorno)
- [Herramientas disponibles](#herramientas-disponibles)
- [¿Cómo actualizo?](#cómo-actualizo)
- [Solución de problemas](#solución-de-problemas)
- [Limitaciones conocidas](#limitaciones-conocidas)

---

## Instalación

Antes de empezar necesitas una **API key de Wasapi**. Consíguela en [app.wasapi.io/account/developer](https://app.wasapi.io/account/developer).

### Opción 1 — Claude Desktop, sin terminal

La forma más fácil si usas Claude Desktop y no quieres tocar la terminal:

1. Descarga **[wasapi-mcp.mcpb](https://github.com/Vinix-Code-Dev/wasapi-mcp-server/releases/latest/download/wasapi-mcp.mcpb)** (enlace directo, siempre la última versión).
2. Haz doble click en el archivo — Claude Desktop abre el diálogo de instalación.
3. Pega tu API key de Wasapi.
4. Haz click en **Instalar**.
5. **Activa la extensión:** ve a **Configuración → Extensiones**, busca "Wasapi" y enciéndela (Claude Desktop instala deshabilitadas las extensiones de desarrolladores no verificados).
6. Abre un chat nuevo y prueba: *"Lista mis números de WhatsApp"*.

> **Nota:** verás un aviso de que el desarrollador "no está verificado por Anthropic". Es lo esperado para extensiones distribuidas fuera del directorio oficial de Anthropic; la fuente es este repositorio.

### Opción 2 — Asistente de configuración (recomendada para developers)

No necesitas instalar nada previamente — `npx` descarga y ejecuta el paquete en un solo paso:

```bash
npx -y @wasapi/mcp-server setup --restart
```

El asistente te guía por todo el proceso:

1. Abre tu navegador en el panel de Wasapi para que copies tu API key
2. Valida la key contra el API en vivo
3. Selecciona un número de WhatsApp por defecto (si tienes alguno)
4. Detecta tu cliente MCP (Claude Desktop / Cursor) y escribe la configuración
5. Reinicia la aplicación por ti (con el flag `--restart`)

<details>
<summary>¿Prefieres instalarlo globalmente?</summary>

```bash
npm install -g @wasapi/mcp-server
wasapi-mcp setup --restart
```

Con la instalación global, el comando `wasapi-mcp` queda disponible en tu terminal de forma permanente.

</details>

### Opción 3 — Configuración manual

Si prefieres editar la configuración tú mismo:

1. Consigue tu API key en [app.wasapi.io/account/developer](https://app.wasapi.io/account/developer)
2. Agrega este bloque a la configuración de tu cliente MCP:

```json
{
  "mcpServers": {
    "wasapi": {
      "command": "npx",
      "args": ["-y", "@wasapi/mcp-server"],
      "env": {
        "WASAPI_API_KEY": "tu_api_key_aquí",
        "WASAPI_FROM_ID": "12345"
      }
    }
  }
}
```

3. Reinicia tu cliente MCP.

**Rutas de configuración más comunes:**

| Cliente | macOS | Linux | Windows |
|---|---|---|---|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` | `~/.config/Claude/claude_desktop_config.json` | `%APPDATA%\Claude\claude_desktop_config.json` |
| Cursor | `~/.cursor/mcp.json` | `~/.cursor/mcp.json` | `%USERPROFILE%\.cursor\mcp.json` |

> **Tip:** `npx -y @wasapi/mcp-server setup --print-only` genera este JSON ya personalizado con tu cuenta, sin escribir ningún archivo.

---

## ¿Qué puedo hacer?

Una vez instalado, háblale a tu cliente MCP en lenguaje natural. Algunos ejemplos:

> *"Lista los primeros 10 contactos de mi cuenta de Wasapi."*

> *"¿Cuántos contactos tengo en total?"*

> *"Crea un contacto: Ana Gómez, teléfono +57 300 123 4567, código de país 57."*

> *"Envíale por WhatsApp a +57 300 123 4567 el mensaje: 'Hola Ana, te confirmo tu cita mañana a las 10am.'"*

> *"Etiqueta al contacto con UUID `abc-123` con el label 42."*

> *"Muéstrame los últimos mensajes con el wa_id 573001234567."*

> *"Envíale la plantilla de bienvenida al 573001234567 con el nombre Ana en la variable 1."*

> *"¿Qué flows tengo configurados? Envíale el flow de encuesta al 573001234567."*

> *"¿Cómo le fue a mi última campaña? ¿Cuántos mensajes se entregaron?"*

> *"¿Cuántos mensajes enviamos entre el 1 y el 31 de enero? ¿Y cuántos agentes están en línea ahora?"*

> *"Desactiva el bot para el contacto 573001234567 y dime qué campos personalizados tengo configurados."*

> *"Muéstrame las conversaciones abiertas sin etiqueta y dame el reporte de satisfacción del último mes."*

Claude decide cuál de las 62 herramientas usar, pide aclaraciones si algo es ambiguo, y te muestra la respuesta.

---

## Clientes compatibles

Funciona con **cualquier cliente MCP que ejecute servidores locales por stdio**:

| Cliente | Instalación | Notas |
|---|---|---|
| **Claude Desktop** | `.mcpb` (Opción 1) o asistente (Opción 2) | Recomendado |
| **Cursor** | Asistente (Opción 2) con auto-configuración y reinicio | |
| **Claude Code** | `setup --print-only` + `claude mcp add` o editar `~/.claude.json` | |
| **Windsurf, Zed y otros** | `setup --print-only` + pegar el JSON en su configuración | |

> **Importante:** este es un servidor MCP **local (stdio)**. **No funciona en Claude.ai web** — eso requiere un servidor MCP hosteado, que es un modelo de despliegue distinto.

---

## Referencia del asistente (`setup`)

```bash
npx -y @wasapi/mcp-server setup [flags]
```

| Flag | Descripción |
|---|---|
| `--target claude-desktop\|cursor` | Salta el menú de plataforma e instala directo en esa |
| `--restart` | Reinicia la aplicación destino automáticamente al terminar (solo macOS) |
| `--print-only` | Imprime el JSON personalizado; nunca escribe en disco |
| `--local` | (desarrollo) Escribe la ruta local del repo en vez de `npx` |

**Ejemplos:**

```bash
# Configurar Claude Desktop y reiniciarlo automáticamente
npx -y @wasapi/mcp-server setup --target claude-desktop --restart

# Obtener el JSON para pegarlo manualmente en Windsurf / Zed / Claude Code
npx -y @wasapi/mcp-server setup --print-only
```

---

## Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `WASAPI_API_KEY` | Sí | Tu API key de Wasapi. Consíguela en [app.wasapi.io/account/developer](https://app.wasapi.io/account/developer) |
| `WASAPI_FROM_ID` | No | ID del número de WhatsApp por defecto para mensajes salientes. Descúbrelo con la herramienta `list_whatsapp_numbers` |
| `WASAPI_BASE_URL` | No | Sobrescribe la URL base del SDK (staging / pruebas) |
| `WASAPI_DEBUG` | No | Ponla en `1` para logs detallados de errores por stderr |

---

## Herramientas disponibles

**62 herramientas en total.**

### Contactos (9)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `list_contacts` | Lista paginada de contactos con búsqueda opcional | `search`, `labels[]`, `page` |
| `get_contact` | Obtiene un contacto por su WhatsApp ID | `wa_id` |
| `create_contact` | Crea un contacto | `first_name` (requerido), `phone`, `country_code`, `last_name`, `email` |
| `update_contact` | Actualiza un contacto existente | `wa_id` + campos a cambiar |
| `delete_contact` | Elimina un contacto permanentemente | `wa_id` |
| `add_label_to_contact` | Agrega una etiqueta | `contact_uuid`, `label_id` |
| `remove_label_from_contact` | Quita una etiqueta | `contact_uuid`, `label_id` |
| `assign_agent_to_contact` | Asigna un agente automáticamente | `contact_uuid` |
| `export_contacts` | Inicia una exportación de todos los contactos | `email_urls[]` (opcional) |

Los contactos se identifican por `wa_id` (un WhatsApp ID en texto), no por ID numérico.

### WhatsApp — Mensajería y conversaciones (7)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `list_whatsapp_numbers` | Lista los números conectados y sus `from_id` | — |
| `send_message` | Envía un mensaje de texto | `wa_id`, `message`, `from_id` (opcional) |
| `send_template` | Envía una plantilla aprobada, con variables y adjunto por URL | `recipients[]`, `template_id`, `contact_type`, `body_vars[]`, `url_file`, `from_id` (opcionales) |
| `send_attachment` | Envía un archivo desde una ruta local | `wa_id`, `filePath`, `caption`, `filename`, `from_id` (opcionales) |
| `send_contact_card` | Envía tarjetas de contacto (vCard) | `wa_id`, `contacts[]`, `from_id` (opcional) |
| `get_conversation` | Obtiene el hilo de mensajes con un contacto | `wa_id`, `from_id`, `page` (opcionales) |
| `change_conversation_status` | Cambia el estado de la conversación | `wa_id`, `status` (open/hold/closed), `agent_id` (opcional) |

### WhatsApp — Plantillas (5)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `list_whatsapp_templates` | Lista todas las plantillas de la cuenta | — |
| `get_whatsapp_template` | Detalle de una plantilla | `template_uuid` |
| `get_template_fields` | Variables que acepta una plantilla (úsalo antes de `send_template`) | `template_uuid` |
| `list_templates_by_number` | Plantillas disponibles para un número | `from_id` |
| `sync_meta_templates` | Sincroniza plantillas desde Meta | — |

### WhatsApp — Flows (6)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `list_flows` | Lista los WhatsApp Flows de la cuenta | — |
| `list_flows_by_number` | Flows disponibles para un número | `from_id` (opcional) |
| `send_flow` | Envía un Flow interactivo a un contacto | `wa_id`, `message`, `cta`, `screen`, `flow_id` |
| `get_flow_responses` | Respuestas que enviaron los usuarios por un Flow | `flow_id`, `page` (opcional) |
| `get_flow_assets` | Detalle y assets de un Flow | `flow_id` |
| `get_flow_screens` | Pantallas de un Flow (para elegir `screen` en `send_flow`) | `flow_id` |

### Campañas (2)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `list_campaigns` | Lista las campañas de difusión de la cuenta | — |
| `get_campaign` | Detalle de una campaña con sus envíos por contacto | `campaign_uuid` |

> Crear, editar o eliminar campañas aún no está disponible (el SDK no lo implementa todavía).

### Funnels (3)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `list_funnels` | Lista los embudos de venta y sus etapas | — |
| `search_contact_in_funnels` | Busca un contacto en los embudos | `phone_number` o `contact_uuid` |
| `move_contact_to_funnel_stage` | Mueve un contacto a otra etapa | `funnel_contact_id`, `to_stage_id` |

### Métricas (11)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `get_online_agents` | Agentes en línea | — |
| `get_status_contacts` | Contactos por estado | — |
| `get_total_campaigns` | Total de campañas en un rango | `start_date`, `end_date` |
| `get_consolidated_conversations` | Conversaciones consolidadas | `start_date`, `end_date` |
| `get_agent_conversations` | Conversaciones por agente | `start_date`, `end_date` |
| `get_messages` | Volumen de mensajes | `start_date`, `end_date` |
| `get_messages_bot` | Mensajes del bot | `start_date`, `end_date` |
| `get_agent_time_response` | Tiempo de respuesta de un agente | `agent_id`, `start_date`, `end_date` |
| `get_agent_transferred` | Conversaciones transferidas de un agente | `agent_id`, `start_date`, `end_date` |
| `get_agent_volume_of_work` | Volumen de trabajo de un agente | `agent_id`, `start_date`, `end_date` |
| `get_agent_time_in_conversation` | Tiempo en conversación de un agente | `agent_id`, `start_date`, `end_date` |

Las métricas con rango de fechas esperan formato `YYYY-MM-DD`.

### Bot (1)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `toggle_bot_status` | Activa/desactiva el chatbot para un contacto | `wa_id`, `action` (enable/disable/disable_permanently), `from_id` (opcional) |

### Workflow (1)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `get_workflow_statuses` | Lista cambios de estado de conversaciones, con filtros | `action`, `phone`, `agent_id`, `dates`, `per_page`, `page` (todos opcionales) |

### Campos personalizados (5)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `list_custom_fields` | Lista los campos personalizados | — |
| `get_custom_field` | Obtiene un campo por ID | `field_id` |
| `create_custom_field` | Crea un campo | `name` |
| `update_custom_field` | Renombra un campo | `field_id`, `name` |
| `delete_custom_field` | Elimina un campo | `field_id` |

### Usuario (1)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `get_current_user` | Datos de la cuenta asociada a la API key | — |

### Conversaciones (2)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `list_conversations` | Lista conversaciones (paginado por cursor) con filtros | `status`, `query`, `phones`, `labels`, `agents`, `dates`, `per_page` (todos opcionales) |
| `get_conversations_next_page` | Siguiente página vía cursor | `cursor` + mismos filtros |

### Etiquetas (6)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `list_labels` | Lista las etiquetas | — |
| `search_labels` | Busca etiquetas por nombre | `name` |
| `get_label` | Obtiene una etiqueta por ID | `label_id` |
| `create_label` | Crea una etiqueta | `title`, `color`, `description` (opcional) |
| `update_label` | Actualiza una etiqueta | `label_id`, `title`, `color`, `description` (opcional) |
| `delete_label` | Elimina una etiqueta | `label_id` |

### Reportes (3)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `get_agent_performance_report` | Desempeño por agente en un rango | `start_date`, `end_date`, `agent_id` (opcional) |
| `get_workflow_volume_report` | Volumen de workflow en un rango | `start_date`, `end_date`, `from_id` (opcional) |
| `get_satisfaction_survey_report` | Encuestas de satisfacción en un rango | `start_date`, `end_date`, `agent_id` (opcional) |

---

## ¿Cómo actualizo?

Depende de cómo instalaste:

### Si usaste el asistente o la configuración manual con `npx`

Tu configuración usa `npx -y @wasapi/mcp-server` sin versión fijada, así que **basta con reiniciar tu cliente MCP** (Cmd+Q completo + abrir) — npx resuelve la última versión automáticamente.

Si por caché te sigue sirviendo una versión vieja, fuérzala y reinicia:

```bash
npx -y @wasapi/mcp-server@latest --version
```

### Si lo instalaste globalmente

```bash
npm install -g @wasapi/mcp-server@latest
```

y reinicia tu cliente.

### Si instalaste la extensión `.mcpb` en Claude Desktop

Las extensiones instaladas fuera del directorio oficial de Anthropic **no se actualizan solas**:

1. Descarga el nuevo **[wasapi-mcp.mcpb](https://github.com/Vinix-Code-Dev/wasapi-mcp-server/releases/latest/download/wasapi-mcp.mcpb)** (siempre apunta a la última versión)
2. Haz doble click — Claude Desktop detecta la extensión existente y la actualiza
3. Tu API key se conserva, pero tenla a mano por si el diálogo la vuelve a pedir
4. Verifica que la extensión siga activa en **Configuración → Extensiones**

> Puedes ver qué versión tienes instalada en Configuración → Extensiones → Wasapi.

---

## Solución de problemas

### "Instalé la extensión pero Claude no ve las herramientas de Wasapi"

Las extensiones de desarrolladores no verificados se instalan **deshabilitadas**. Ve a **Configuración → Extensiones**, busca "Wasapi" y actívala. Luego abre un **chat nuevo** (los chats abiertos antes de activar no recargan las herramientas).

### "Ejecuté el asistente pero el MCP no aparece en mi cliente"

1. **Reinicio completo, no solo cerrar la ventana.** En macOS: `Cmd+Q`, no la × roja. O usa el flag `--restart`.
2. **Verifica la ruta de configuración.** El asistente imprime la ruta donde escribió. Confirma que sea la misma que usa tu cliente (tabla de rutas arriba).
3. **Revisa variables de entorno conflictivas** que hayan quedado de pruebas anteriores:
   ```bash
   echo $CLAUDE_DESKTOP_CONFIG
   echo $CURSOR_MCP_CONFIG
   ```
   Si alguna imprime una ruta, elimínala (`unset CLAUDE_DESKTOP_CONFIG`) y vuelve a ejecutar el asistente. El asistente actual te advierte de esto, pero versiones anteriores no.

### "Las herramientas devuelven 'API key inválida o sin permisos'"

Tu API key funciona pero no tiene permiso para ese endpoint. Revisa la consola de desarrollador en [app.wasapi.io/account/developer](https://app.wasapi.io/account/developer) y confirma que la key tiene los permisos que necesitas.

### "send_attachment falla: archivo no encontrado"

El `filePath` debe existir en la **máquina donde corre el servidor MCP** (tu computador), no en la del cliente. Los adjuntos por URL aún no están soportados por el SDK; descarga el archivo localmente primero.

### Activar logs de depuración

```bash
WASAPI_DEBUG=1 wasapi-mcp
```

O agrega `"WASAPI_DEBUG": "1"` al bloque `env` de tu configuración MCP. Los logs salen por stderr.

---

## Limitaciones conocidas

| Limitación | Detalle |
|---|---|
| `send_attachment` requiere ruta local | Para enviar archivos por URL usa `send_template` con `url_file`. |
| No funciona en Claude.ai web | Requiere un servidor MCP hosteado (modelo de despliegue distinto). |

---

<!--
## Desarrollo

```bash
git clone https://github.com/Vinix-Code-Dev/wasapi-mcp-server.git
cd wasapi-mcp-server
npm install
npm run dev          # ejecutar con tsx (requiere WASAPI_API_KEY)
npm test             # tests unitarios + de contrato
npm run typecheck
npm run build
npm run package:dxt  # generar el bundle .mcpb para Claude Desktop
```

### Tests de integración (opcionales)

```bash
WASAPI_TEST_API_KEY=tu_key npm run test:integration
```

El smoke test de integración llama `list_contacts` contra el API real de Wasapi. Se omite si `WASAPI_TEST_API_KEY` no está definida.

### Publicar una nueva versión

```bash
npm version patch            # o minor / major
git push --follow-tags
npm publish --access public  # requiere OTP
npm run package:dxt
gh release create vX.Y.Z release/wasapi-mcp-X.Y.Z.mcpb release/wasapi-mcp.mcpb --title "..." --notes "..."
```

Checklist manual previo al release: [`docs/mcpb-smoke.md`](./docs/mcpb-smoke.md).

---
-->


## Licencia

ISC
