# 🤖 Automation Engine — PRN-Vigilante

Motor de automação responsável pelo envio inteligente de mensagens via WhatsApp.

## 📁 Estrutura

```
automation/
├── .env                    # Credenciais (Supabase + Evolution API)
├── README.md               # Este arquivo
├── src/
│   ├── index.ts            # Ponto de entrada principal
│   ├── core/               # Lógica central (Engine, Fila, Anti-Ban)
│   ├── services/           # Drivers de conexão
│   │   ├── supabase.ts     # Cliente Supabase
│   │   └── evolution.ts    # Cliente Evolution API
│   ├── types/              # Definições TypeScript
│   │   └── index.ts        # Interfaces e tipos
│   └── utils/              # Utilitários
│       └── helpers.ts      # Sleep, delays, formatadores
└── docs/                   # Documentação técnica interna
```

## 🚀 Como Rodar

```bash
cd automation
bun run src/index.ts
```

## 📌 Status

- [x] Estrutura de pastas criada
- [x] Drivers de conexão (Supabase + Evolution) prontos
- [x] Tipos e utilitários definidos
- [ ] Lógica de envio (aguardando definição do fluxo)
- [ ] Anti-Ban Engine
- [ ] Testes
