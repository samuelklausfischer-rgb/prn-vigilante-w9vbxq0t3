export function formatBrFromIso(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso
  const [, y, mm, dd] = m
  return `${dd}/${mm}/${y}`
}

export function buildSaraMessage(params: {
  data_exame_iso?: string
  dataBr?: string
  horario: string
  nome?: string
  procedimentos?: string
}): string {
  const dataBr = params.dataBr || (params.data_exame_iso ? formatBrFromIso(params.data_exame_iso) : '')
  const nome = params.nome?.trim() || 'NÃO INFORMADO'
  const procedimentos = params.procedimentos?.trim() || 'NÃO INFORMADO'

  return `SEU EXAME JÁ ESTÁ MARCADO E FOI DESIGNADO UM *NOVO HORÁRIO PARA MELHOR ORGANIZAÇÃO DO ATENDIMENTO*. AO LER ESTE TEXTO ABAIXO ENCONTRARÁ O HORÁRIO E TODAS AS INFORMAÇÕES NECESSÁRIAS. *NÃO É PERMITIDO ESCOLHER O HORÁRIO OU PERÍODO.*

Olá! Aqui é Sara, representante do Hospital São Benedito
📍 Av. São Sebastião, 3300 - Quilombo, Cuiabá - MT

👤 *PACIENTE:* ${nome}
🏥 *EXAME DE RESSONANCIA MAGNÉTICA DA(O):* ${procedimentos}
🕐 *HORÁRIO DO EXAME:* ${params.horario}
🕐 *DIA DO EXAME:* ${dataBr}

O HORÁRIO INFORMADO NO PEDIDO MÉDICO NÃO SE APLICA. DEFINIMOS UM *HORÁRIO INDIVIDUAL PARA EVITAR SUPERLOTAÇÃO* E REDUZIR TEMPO DE ESPERA. Quando o pedido é realizado na unidade de saúde, o sistema agenda automaticamente (07h, 13h ou 19h por ordem de chegada). Porém, para melhor organização, foi definido um horário individual para cada paciente, que deve ser respeitado.

📄 *DOCUMENTOS NECESSÁRIOS:*
• Cartão do SUS
• Pedido médico
• Documento de regulação
• Laudos de exames anteriores (se por um acaso tiver exames anteriores *OBRIGATÓRIO TRAZE-LOS* para retirada do exame)

ABAIXO *INFORMAÇÕES DE JEJUM* SE POR ACASO EM SEU PEDIDO ESTIVER ESCRITO NA FRENTE DO RESPECTIVO EXAME A PALAVRA: *C/C = COM CONTRASTE* OU *COM SEDAÇÃO* PRECISARÁ DE JEJUM, CASO CONTRÁRIO NÃO PRECISA DE JEJUM

✔ Exames com contraste → 2 horas de jejum
✔ Exames com sedação → 8 horas de jejum
✔ Chegar com 15 minutos de antecedência

📲 POSSO CONFIRMAR O SEU AGENDAMENTO?

*✔ Casos específicos:*
• Ressonância de *pelve e vias biliares* → 6 horas de jejum
• Ressonância de *coração e mama* → 2 horas de jejum
• Ressonância *com contraste* → 2 horas de jejum
• Ressonância *com sedação* → 8 horas de jejum`
}
