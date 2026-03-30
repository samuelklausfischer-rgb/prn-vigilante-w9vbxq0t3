# Automation Engine - PRN-Vigilante

Worker responsavel por processar a fila do Supabase e enviar mensagens pela Evolution API.

## Requisitos

- Bun 1.2+
- Variaveis de ambiente configuradas

## Variaveis obrigatorias

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`

Use `automation/.env.example` como base.

## Execucao local

```bash
cd automation
bun install
bun run start
```

Modo diagnostico:

```bash
bun run diag
```

Healthcheck sem efeito colateral:

```bash
bun run healthcheck
```

## Execucao com Docker

Build da imagem:

```bash
docker build -t prn-automation-worker ./automation
```

Execucao do container:

```bash
docker run --rm --env-file ./automation/.env prn-automation-worker
```

## Deploy recomendado

- Publicar imagem no GHCR.
- Rodar no EasyPanel como worker (1 replica).
- Manter restart policy e monitoramento de logs ativos.
