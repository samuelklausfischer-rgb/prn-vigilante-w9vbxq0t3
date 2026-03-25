import { getConnectionStatus } from '../services/evolution'
import { getInstanceById } from '../services/supabase'
import type { ClaimedMessage } from '../types'
import { timestamp } from '../utils/helpers'

export interface SelectedInstance {
  id: string
  instanceName: string
  /** true se esta instância foi selecionada por afinidade (já existia vínculo) */
  isAffinityMatch: boolean
}

/**
 * Validador de instância com AFINIDADE ESTRITA.
 *
 * REGRA DE OURO:
 * - Se a mensagem já tem locked_instance_id → usa ESSA instância obrigatoriamente
 * - Se a instância vinculada estiver offline → retorna null (NÃO troca!)
 * - Se não tem vínculo → valida a instância do round-robin (claim_next_message)
 *
 * Troca de instância só é permitida quando MUDA O NÚMERO do paciente
 * (escada de telefones: Tel1 → Tel2 → Tel3)
 */
export class InstanceSelector {
  /** Cache de status para evitar chamadas excessivas à Evolution API */
  private statusCache = new Map<string, { status: string; cachedAt: number }>()
  private readonly cacheTtlMs = 30_000 // 30 segundos

  async resolveFromClaim(claim: ClaimedMessage): Promise<SelectedInstance | null> {
    // ──────────────────────────────────────
    // CASO 1: Mensagem tem instância vinculada (AFINIDADE)
    // ──────────────────────────────────────
    if (claim.locked_instance_id) {
      const affinityInstance = await getInstanceById(claim.locked_instance_id)

      if (!affinityInstance?.instance_name) {
        console.warn(
          `[${timestamp()}] ⚠️ Instância vinculada ${claim.locked_instance_id} não encontrada no banco. BLOQUEANDO envio.`,
          {
            messageId: claim.id,
            lockedInstanceId: claim.locked_instance_id,
          },
        )
        // NÃO trocar — a instância pode ter sido deletada. Exigir intervenção manual.
        return null
      }

      const status = await this.getCachedConnectionStatus(affinityInstance.instance_name)
      const normalized = String(status).toLowerCase()

      if (!['open', 'connected'].includes(normalized)) {
        console.warn(
          `[${timestamp()}] ⛔ AFINIDADE BLOQUEADA: Instância ${affinityInstance.instance_name} está OFFLINE (status: ${normalized}). NÃO será trocada — aguardando reconexão ou intervenção manual.`,
          {
            messageId: claim.id,
            lockedInstanceId: claim.locked_instance_id,
            instanceName: affinityInstance.instance_name,
            instanceStatus: normalized,
          },
        )
        // Retorna null — a mensagem volta para a fila e aguarda
        return null
      }

      console.log(
        `[${timestamp()}] 🔗 Afinidade respeitada: ${affinityInstance.instance_name} continua dona do número`,
        {
          messageId: claim.id,
          instanceName: affinityInstance.instance_name,
        },
      )

      return {
        id: claim.locked_instance_id,
        instanceName: affinityInstance.instance_name,
        isAffinityMatch: true,
      }
    }

    // ──────────────────────────────────────
    // CASO 2: Sem vínculo — usar instância do round-robin (claim_next_message)
    // ──────────────────────────────────────
    const instance = await getInstanceById(claim.instance_id)
    if (!instance?.instance_name) {
      console.log(`[${timestamp()}] ⚠️ Instância ${claim.instance_id} não encontrada no banco.`)
      return null
    }

    const status = await this.getCachedConnectionStatus(instance.instance_name)
    const normalized = String(status).toLowerCase()

    if (!['open', 'connected'].includes(normalized)) {
      console.log(
        `[${timestamp()}] ⚠️ Instância ${instance.instance_name} offline (status: ${normalized}).`,
      )
      return null
    }

    console.log(
      `[${timestamp()}] 🆕 Novo vínculo: ${instance.instance_name} será dona deste número`,
      {
        messageId: claim.id,
        instanceName: instance.instance_name,
      },
    )

    return {
      id: claim.instance_id,
      instanceName: claim.instance_name,
      isAffinityMatch: false,
    }
  }

  /**
   * Consulta o status de conexão com cache de curta duração.
   * Evita bombardear a Evolution API com consultas repetidas.
   */
  private async getCachedConnectionStatus(instanceName: string): Promise<string> {
    const cached = this.statusCache.get(instanceName)
    const now = Date.now()

    if (cached && now - cached.cachedAt < this.cacheTtlMs) {
      return cached.status
    }

    const status = await getConnectionStatus(instanceName)
    this.statusCache.set(instanceName, { status, cachedAt: now })
    return status
  }
}
