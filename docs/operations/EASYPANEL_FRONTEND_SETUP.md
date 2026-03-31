# EasyPanel - Setup do Frontend (URL publica)

Deploy pratico do painel React/Vite como servico web no EasyPanel, com fallback SPA e link publico.

---

## 1) Criar servico

- Service type: `App` / `Web Service`
- Service name: `prn-frontend`
- Source type: `GitHub`
- Repository/Branch: repo atual e branch ativa de deploy

---

## 2) Build por Dockerfile

- Build method: `Dockerfile`
- Dockerfile path: `./Dockerfile`
- Build context: raiz do projeto
- Internal port: `80`

Importante: as variaveis `VITE_*` precisam entrar como **Build Args** para o `vite build`.

---

## 3) Build Args (obrigatorio)

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
```

Se o painel do EasyPanel nao separar Build Args de Environment, preencha em ambos.

---

## 4) Environment Variables (runtime)

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
```

---

## 5) Dominio e link

- Expor rota publica HTTP do servico
- Usar URL temporaria do EasyPanel no primeiro deploy
- Opcional depois: apontar subdominio (`painel.seudominio.com`)

---

## 6) Fallback SPA

Este projeto usa `BrowserRouter`, entao refresh em rotas como `/whatsapp` precisa cair em `index.html`.

Ja configurado em `nginx.conf`:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

## 7) Validacao pos-deploy

1. Abrir URL publica gerada pelo EasyPanel
2. Logar no painel
3. Abrir `/whatsapp`
4. Dar refresh em `/whatsapp` (sem 404)
5. Abrir `/analytics` ou `/crm`
6. Confirmar carregamento normal dos dados

---

## 8) Troubleshooting rapido

- Build falha por env: confirmar `VITE_*` em Build Args.
- Refresh com 404: confirmar `nginx.conf` com fallback SPA.
- Tela sem dados: conferir `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
