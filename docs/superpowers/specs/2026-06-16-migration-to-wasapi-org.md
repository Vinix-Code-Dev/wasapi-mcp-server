# Migración a la marca oficial @wasapi — Plan operativo

**Date:** 2026-06-16
**Status:** Approved
**Owner:** juanpablo@wasapi.io

## Objetivo

Migrar el MCP de la cuenta/marca personal a la oficial de Wasapi, como **v1.0.0** (lanzamiento oficial).

| Aspecto | Antes | Después |
|---|---|---|
| Paquete npm | `@jpabloe/wasapi-mcp-server` | `@wasapi/mcp-server` |
| Repo GitHub | `juanpablo-estrada/wasapi-mcp-server` | `Vinix-Code-Dev/wasapi-mcp-server` |
| Versión | 0.8.0 | **1.0.0** |

## Decisiones (confirmadas con el usuario)

1. **Versión 1.0.0** — marca el lanzamiento oficial.
2. **`@jpabloe/wasapi-mcp-server` se deja intacto** en npm (no deprecar, no despublicar). Conviven; el nuevo es el oficial.
3. **Transferir** el repo de GitHub (no crear uno nuevo): conserva issues/stars/historial y crea redirects automáticos desde la URL vieja.

## Prerrequisitos verificados

- Scope `@wasapi` existe en npm; el usuario (`jpabloe`) tiene acceso `read-write` (es miembro). `@wasapi/mcp-server` está libre.
- El usuario es miembro de la org de GitHub `Vinix-Code-Dev` (donde vive `wasapi-js-sdk`).
- `src/index.ts` ya usaba `@wasapi/mcp-server` en su help text (nunca se actualizó a @jpabloe) — la migración lo deja consistente.

## Cambios de código (6 archivos vivos)

| Archivo | Cambio |
|---|---|
| `package.json` | `name` → `@wasapi/mcp-server`; `version` → `1.0.0`; `repository.url` → Vinix-Code-Dev. `author.url` se mantiene (perfil personal del autor). |
| `scripts/generate-manifest.mjs` | URL fallback en `repoUrlToHttps` → Vinix-Code-Dev (homepage/docs/support se derivan de repository.url, se actualizan solos). |
| `src/setup/index.ts` | `buildEntry`: `npx -y @jpabloe/wasapi-mcp-server` → `@wasapi/mcp-server`. |
| `README.md` | Todas las refs `@jpabloe/wasapi-mcp-server` → `@wasapi/mcp-server`; `juanpablo-estrada` → `Vinix-Code-Dev` (badges, links de descarga `.mcpb`, comandos). |
| `tests/unit/generate-manifest.test.ts` | Fixture `repository.url` y assertions de homepage/docs/support → Vinix-Code-Dev. (author.url del fixture se mantiene.) |
| `tests/unit/setup-config-write.test.ts` | Fixture `args` del WasapiEntry → `@wasapi/mcp-server`. |

**No cambian:** el `name` interno del manifest DXT (`wasapi-mcp`), el `.mcpb` es autocontenido (no referencia el nombre npm), los docs históricos en `docs/superpowers/` (son registro fechado).

## Secuencia operativa

1. Aplicar renames + bump 1.0.0. Verificar: `npm test` (256), `typecheck`, `build`, `npm pack` leak 0, y grep sin refs viejas en código vivo. Commit.
2. Transferir repo `juanpablo-estrada/wasapi-mcp-server` → `Vinix-Code-Dev` (gh api o UI). Actualizar `git remote origin`.
3. Push commits + tag `v1.0.0` al repo de la org.
4. Build `.mcpb` 1.0.0.
5. **Usuario** publica `@wasapi/mcp-server@1.0.0` en npm (requiere OTP).
6. Crear GitHub Release `v1.0.0` en el repo de la org con los `.mcpb`.
7. Verificar: npm version, link estable de descarga, redirect del repo viejo.

## Notas para usuarios existentes

Quienes usen `@jpabloe/wasapi-mcp-server` o el `.mcpb` viejo siguen funcionando (el paquete viejo queda intacto). La migración al oficial es: cambiar el paquete a `@wasapi/mcp-server` en su config (o reinstalar el `.mcpb` del nuevo release). Documentar en las notas del release v1.0.0.
