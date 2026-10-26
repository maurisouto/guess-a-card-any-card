# Checklist de traspaso (quien entrega el repo)

Usar al transferir el repositorio a otro usuario u organización.

## Repositorio

- [ ] Nuevo remote / transferencia de ownership en GitHub (o equivalente)
- [ ] Colaboradores invitados con permisos adecuados
- [ ] Ramas principales documentadas (`main`, feature branches abiertas)
- [ ] Issues / PRs pendientes enlazados o exportados

## Secretos (nunca en git)

- [ ] Rotar o reasignar `DATABASE_URL` (Supabase / Postgres)
- [ ] Reasignar `NEXT_PUBLIC_SUPABASE_*` y claves de servicio Supabase
- [ ] Actualizar `CORS_ORIGIN`, `API_PROXY_TARGET` en Vercel/Render
- [ ] `COOP_REALTIME_SECRET` si se usa co-op WS
- [ ] OAuth redirect URLs en Supabase → `{origen}/auth/callback`

## Hosting

- [ ] Acceso a Vercel (proyecto web)
- [ ] Acceso a Render/Netlify (API)
- [ ] Confirmar que el build de API ejecuta `npm run db:deploy`
- [ ] Smoke post-deploy: `/api/health`, `/`, `/puzzle`, `/puzzle/leaderboard`

## Documentación entregada

- [ ] Destinatario leyó **[HANDOFF.md](./HANDOFF.md)**
- [ ] Cursor del destinatario abre el repo (regla `.cursor/rules/project-context.mdc` se aplica sola)
- [ ] `.env.example` copiado a `.env` local del destinatario

## Verificación local del destinatario

```bash
npm install
cp .env.example .env   # completar
npm run db:deploy
npm run dev:api        # terminal 1
npm run dev            # terminal 2
npm test
```

## Código sin commitear

- [ ] Avisar si hay cambios locales no pusheados (migraciones Fragments, assets, etc.)
- [ ] Decidir si se mergea a `main` antes del traspaso o se documenta la rama

## Contacto

- [ ] Canal de preguntas durante la transición (1–2 semanas recomendado)
- [ ] Credenciales de servicios compartidas de forma segura (1Password, etc.)
