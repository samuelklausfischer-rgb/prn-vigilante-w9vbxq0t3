import type { CampaignKind } from '../types'

export function getConfirmationMessageTemplate(): string {
  return `Olá, aqui é a Sara do Hospital São Benedito 😊
Estamos passando confirmando o seu exame agendado.
Pedimos, por gentileza, que responda a esta mensagem confirmando sua presença. Caso haja qualquer imprevisto, nos avise com antecedência para reorganizarmos a agenda.`
}

export function getPostAttendanceMessageTemplate(): string {
  return `Olá, boa tarde! Compareceu a seu exame? Caso tenha existido algum problema para o não comparecimento, favor responder a esta mensagem para reagendarmos.`
}

export function getCampaignDefaultMessage(kind: CampaignKind): string {
  switch (kind) {
    case 'confirmation':
      return getConfirmationMessageTemplate()
    case 'post_attendance':
      return getPostAttendanceMessageTemplate()
  }
}
