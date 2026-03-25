import { formatDataExameBr } from '@/lib/utils/data-exame'

export function buildSaraMessage(params: {
  data_exame_iso: string
  dataBr?: string
  horario: string
  nome?: string
  procedimentos?: string
}): string {
  const dataBr = params.dataBr || formatDataExameBr(params.data_exame_iso)
  const nome = params.nome?.trim() || 'NAO INFORMADO'
  const procedimentos = params.procedimentos?.trim() || 'NAO INFORMADO'

  return `SEU EXAME JA ESTA MARCADO E FOI DESIGNADO UM *NOVO HORARIO PARA MELHOR ORGANIZACAO DO ATENDIMENTO*. AO LER ESTE TEXTO ABAIXO ENCONTRARA O HORARIO E TODAS AS INFORMACOES NECESSARIAS. *NAO E PERMITIDO ESCOLHER O HORARIO OU PERIODO.*

Ola! Aqui e Sara, representante do Hospital Sao Benedito
📍 Av. Sao Sebastiao, 3300 - Quilombo, Cuiaba - MT

👤 *PACIENTE:* ${nome}
🏥 *EXAME DE RESSONANCIA MAGNETICA DA(O):* ${procedimentos}
🕐 *HORARIO DO EXAME:* ${params.horario}
🕐 *DIA DO EXAME:* ${dataBr}

O HORARIO INFORMADO NO PEDIDO MEDICO NAO SE APLICA. DEFINIMOS UM *HORARIO INDIVIDUAL PARA EVITAR SUPERLOTACAO* E REDUZIR TEMPO DE ESPERA. Quando o pedido e realizado na unidade de saude, o sistema agenda automaticamente (07h, 13h ou 19h por ordem de chegada). Porem, para melhor organizacao, foi definido um horario individual para cada paciente, que deve ser respeitado.

📄 *DOCUMENTOS NECESSARIOS:*
• Cartao do SUS
• Pedido medico
• Documento de regulacao
• Laudos de exames anteriores (se por um acaso tiver exames anteriores *OBRIGATORIO TRAZE-LOS* para retirada do exame)

ABAIXO *INFORMACOES DE JEJUM* SE POR ACASO EM SEU PEDIDO ESTIVER ESCRITO NA FRENTE DO RESPECTIVO EXAME A PALAVRA: *C/C = COM CONTRASTE* OU *COM SEDACAO* PRECISARA DE JEJUM, CASO CONTRARIO NAO PRECISA DE JEJUM

✔ Exames com contraste -> 2 horas de jejum
✔ Exames com sedacao -> 8 horas de jejum
✔ Chegar com 15 minutos de antecedencia

📲 POSSO CONFIRMAR O SEU AGENDAMENTO?

*✔ Casos especificos:*
• Ressonancia de *pelve e vias biliares* -> 6 horas de jejum
• Ressonancia de *coracao e mama* -> 2 horas de jejum
• Ressonancia *com contraste* -> 2 horas de jejum
• Ressonancia *com sedacao* -> 8 horas de jejum`
}
