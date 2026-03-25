# 🚀 Executável do Worker PRN-Vigilante

Este executável permite rodar o automation worker sem abrir o terminal manualmente.

---

## 📋 Pré-requisitos

Nenhum! O executável é **autocontido** e inclui o runtime Bun.

---

## ⚙️ Configuração Inicial

### 1. Copiar arquivo de exemplo

```bash
cd automation
cp .env.example .env
```

### 2. Editar o `.env`

Abra o arquivo `.env` em um editor de texto e preencha:

| Variável                    | Descrição                    | Exemplo                            |
| --------------------------- | ---------------------------- | ---------------------------------- |
| `SUPABASE_URL`              | URL do projeto Supabase      | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço do Supabase | `eyJhbGc...`                       |
| `EVOLUTION_API_URL`         | URL da Evolution API         | `http://127.0.0.1:8080`            |
| `EVOLUTION_API_KEY`         | Chave da Evolution API       | `evolution_api_key_12345`          |

**Variáveis opcionais:**

- `WORKER_POLL_INTERVAL_MS` (padrão: 5000)
- `WORKER_HEARTBEAT_INTERVAL_MS` (padrão: 30000)
- `WORKER_LOCK_TIMEOUT_MINUTES` (padrão: 5)
- `WORKER_MAX_ATTEMPTS` (padrão: 3)
- `WORKER_NAME` (padrão: "automation-worker")
- `DRY_RUN` (padrão: false)

---

## 🔨 Como Compilar (Desenvolvedores)

### Opção 1: Script de build (Recomendado)

```bash
cd automation
bun run build-exe.ts
```

### Opção 2: Comando direto

```bash
cd automation
bun run build:exe
```

Isso gera `automation-worker.exe` na pasta `automation/`.

---

## ▶️ Como Usar

### Via script npm

```bash
cd automation
bun run start:exe
```

### Diretamente (Windows)

Clique duas vezes em `automation-worker.exe`

O terminal abrirá automaticamente e mostrará os logs do worker em tempo real.

---

## 🛑 Como Parar

Pressione `Ctrl+C` no terminal ou feche a janela do terminal.

---

## 📊 Logs

O worker mostra logs em tempo real:

- ✅ Inicialização
- 🔍 Verificação de mensagens
- 📤 Envio de WhatsApp
- ⚠️ Erros e avisos
- 💓 Heartbeat

---

## 🔧 Modo Diagnóstico

Para ver diagnóstico completo do sistema:

```bash
bun run src/index.ts --diag
```

---

## 📝 Notas Importantes

- O `.env` deve estar na mesma pasta do `.exe`
- Certifique-se que a Evolution API está rodando (Docker)
- Certifique-se que as credenciais do Supabase estão corretas
- O worker mantém um heartbeat ativo (padrão: 30s)

---

## ❓ Solução de Problemas

### Erro: "SUPABASE_URL não encontrado"

- Verifique se o arquivo `.env` existe
- Verifique se a variável foi preenchida

### Erro: "Conexão com Evolution API falhou"

- Verifique se o Docker está rodando
- Verifique se a URL está correta (`http://127.0.0.1:8080`)

### Erro: "Executável não roda"

- Certifique-se de usar Windows (o build é específico para Windows)
- Rebuild o executável se mudar o código fonte

---

## 📦 Estrutura

```
automation/
├── automation-worker.exe    # Executável gerado
├── .env                      # Configuração (OBRIGATÓRIO)
├── .env.example              # Template de configuração
├── build-exe.ts              # Script de build
├── package.json              # Scripts npm
└── src/                      # Código fonte
```

---

**Dúvidas?** Consulte a documentação principal do projeto.
