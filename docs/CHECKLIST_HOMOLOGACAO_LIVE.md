# Checklist de Homologacao Live

Use este checklist durante a virada para VPS em tempo real.

## Contexto da execucao

- Data/hora de inicio:
- Responsavel:
- Ambiente: VPS + EasyPanel + Supabase

---

## 1) Webhook da Evolution

- [ ] URL configurada em `/manager`:
  - `https://yrvorowhddgmwcxrovkg.supabase.co/functions/v1/evolution-webhook`
- [ ] Header configurado:
  - `x-webhook-secret: prnsupersenha123`
- [ ] Eventos ativos:
  - [ ] `MESSAGES_UPSERT`
  - [ ] `MESSAGES_UPDATE`
  - [ ] `CONNECTION_UPDATE`
  - [ ] `QRCODE_UPDATED`

---

## 2) Seguranca do webhook

- [ ] POST sem `x-webhook-secret` retorna `401`
- [ ] POST com `x-webhook-secret` retorna `200`

---

## 3) Canais e conexao (painel)

- [ ] Abrir `WhatsAppSettings`
- [ ] Clicar em sincronizar instancias
- [ ] Criar instancia de teste
- [ ] Gerar QR
- [ ] Conectar canal
- [ ] Status final: `connected`

---

## 4) Fluxo outbound (envio)

- [ ] Inserir 1 paciente de teste na fila
- [ ] Automacao claima a fila
- [ ] Automacao envia mensagem via Evolution
- [ ] Status atualiza corretamente no banco

---

## 5) Fluxo inbound (resposta)

- [ ] Responder pelo WhatsApp
- [ ] Evento chega em `evolution-webhook`
- [ ] Registro criado em `message_events`
- [ ] Atualizacao em `patients_queue`

---

## 6) Classificacao automatica

- [ ] Reply dispara `classify-message`
- [ ] Resultado da classificacao aparece na jornada/fluxo

---

## 7) Resiliencia

- [ ] Reiniciar servico da automacao
- [ ] Heartbeat volta ao normal
- [ ] Fila continua processando apos restart

---

## 8) Resultado da homologacao

- [ ] GO (aprovado para continuar)
- [ ] NO-GO (executar rollback)

Observacoes:

---

## 9) Fechamento

- Data/hora de termino:
- Responsavel pelo aceite:
- Proximo passo:
