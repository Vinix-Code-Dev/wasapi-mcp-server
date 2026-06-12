# Wasapi MCP Server

[![npm version](https://img.shields.io/npm/v/@jpabloe/wasapi-mcp-server.svg)](https://www.npmjs.com/package/@jpabloe/wasapi-mcp-server)
[![license](https://img.shields.io/npm/l/@jpabloe/wasapi-mcp-server.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/@jpabloe/wasapi-mcp-server.svg)](https://nodejs.org)

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
- [Solución de problemas](#solución-de-problemas)
- [Limitaciones conocidas](#limitaciones-conocidas)

---

## Instalación

Antes de empezar necesitas una **API key de Wasapi**. Consíguela en [app.wasapi.io/account/developer](https://app.wasapi.io/account/developer).

### Opción 1 — Claude Desktop, sin terminal

La forma más fácil si usas Claude Desktop y no quieres tocar la terminal:

1. Descarga **[wasapi-mcp.mcpb](https://github.com/juanpablo-estrada/wasapi-mcp-server/releases/latest/download/wasapi-mcp.mcpb)** (enlace directo, siempre la última versión).
2. Haz doble click en el archivo — Claude Desktop abre el diálogo de instalación.
3. Pega tu API key de Wasapi.
4. Haz click en **Instalar**.
5. **Activa la extensión:** ve a **Configuración → Extensiones**, busca "Wasapi" y enciéndela (Claude Desktop instala deshabilitadas las extensiones de desarrolladores no verificados).
6. Abre un chat nuevo y prueba: *"Lista mis números de WhatsApp"*.

> **Nota:** verás un aviso de que el desarrollador "no está verificado por Anthropic". Es lo esperado para extensiones distribuidas fuera del directorio oficial de Anthropic; la fuente es este repositorio.

### Opción 2 — Asistente de configuración (recomendada para developers)

No necesitas instalar nada previamente — `npx` descarga y ejecuta el paquete en un solo paso:

```bash
npx -y @jpabloe/wasapi-mcp-server setup --restart
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
npm install -g @jpabloe/wasapi-mcp-server
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
      "args": ["-y", "@jpabloe/wasapi-mcp-server"],
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

> **Tip:** `npx -y @jpabloe/wasapi-mcp-server setup --print-only` genera este JSON ya personalizado con tu cuenta, sin escribir ningún archivo.

---

## ¿Qué puedo hacer?

Una vez instalado, háblale a tu cliente MCP en lenguaje natural. Algunos ejemplos:

> *"Lista los primeros 10 contactos de mi cuenta de Wasapi."*

> *"¿Cuántos contactos tengo en total?"*

> *"Crea un contacto: Ana Gómez, teléfono +57 300 123 4567, código de país 57."*

> *"Envíale por WhatsApp a +57 300 123 4567 el mensaje: 'Hola Ana, te confirmo tu cita mañana a las 10am.'"*

> *"Etiqueta al contacto con UUID `abc-123` con el label 42."*

> *"Muéstrame los últimos mensajes con el wa_id 573001234567."*

Claude decide cuál de las 12 herramientas usar, pide aclaraciones si algo es ambiguo, y te muestra la respuesta.

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
npx -y @jpabloe/wasapi-mcp-server setup [flags]
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
npx -y @jpabloe/wasapi-mcp-server setup --target claude-desktop --restart

# Obtener el JSON para pegarlo manualmente en Windsurf / Zed / Claude Code
npx -y @jpabloe/wasapi-mcp-server setup --print-only
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

**12 herramientas en total.**

### Contactos (7)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `list_contacts` | Lista paginada de contactos con búsqueda opcional | `search`, `labels[]`, `page` |
| `get_contact` | Obtiene un contacto por su WhatsApp ID | `wa_id` |
| `create_contact` | Crea un contacto | `first_name` (requerido), `phone`, `country_code`, `last_name`, `email` |
| `update_contact` | Actualiza un contacto existente | `wa_id` + campos a cambiar |
| `delete_contact` | Elimina un contacto permanentemente | `wa_id` |
| `add_label_to_contact` | Agrega una etiqueta | `contact_uuid`, `label_id` |
| `remove_label_from_contact` | Quita una etiqueta | `contact_uuid`, `label_id` |

Los contactos se identifican por `wa_id` (un WhatsApp ID en texto), no por ID numérico.

### WhatsApp (5)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `list_whatsapp_numbers` | Lista los números conectados y sus `from_id` | — |
| `send_message` | Envía un mensaje de texto | `wa_id`, `message`, `from_id` (opcional) |
| `send_template` | Envía una plantilla aprobada | `recipients[]`, `template_id` (UUID), `contact_type`, `from_id` (opcional) |
| `send_attachment` | Envía un archivo desde una ruta local | `wa_id`, `filePath`, `caption` (opcional), `from_id` (opcional) |
| `get_conversation` | Obtiene el hilo de mensajes con un contacto | `wa_id`, `from_id` (opcional), `page` (opcional) |

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

### "list_conversations no existe"

Correcto — el SDK aún no lo expone. Usa `get_conversation` con un `wa_id` conocido para traer el hilo de mensajes con ese contacto.

### Activar logs de depuración

```bash
WASAPI_DEBUG=1 wasapi-mcp
```

O agrega `"WASAPI_DEBUG": "1"` al bloque `env` de tu configuración MCP. Los logs salen por stderr.

---

## Limitaciones conocidas

| Limitación | Detalle |
|---|---|
| `list_conversations` no implementado | El SDK no lo expone. Usa `get_conversation` con un `wa_id`. |
| `send_attachment` requiere ruta local | Sin soporte de adjuntos por URL todavía. |
| `send_template` sin variables | El contenido de la plantilla es el que define el template en el servidor. |
| No funciona en Claude.ai web | Requiere un servidor MCP hosteado (modelo de despliegue distinto). |

---

<!--
## Desarrollo

```bash
git clone https://github.com/juanpablo-estrada/wasapi-mcp-server.git
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
