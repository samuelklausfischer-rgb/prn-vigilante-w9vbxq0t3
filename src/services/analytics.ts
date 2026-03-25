import { supabase } from '@/lib/supabase/client'
import type { ArchivePreview } from '@/types'

export async function archiveSelectedPatients(ids: string[]): Promise<{
  success: boolean
  message: string
  archived_count: number
  blocked_count: number
}> {
  try {
    const { error } = await supabase.rpc('archive_selected_patients', { p_ids: ids })
    if (error) throw error

    return {
      success: true,
      message: 'Arquivamento concluído com sucesso',
      archived_count: ids.length,
      blocked_count: 0,
    }
  } catch (e: any) {
    console.error('Error archiving selected patients:', e)
    return {
      success: false,
      message: e.message || 'Erro ao arquivar',
      archived_count: 0,
      blocked_count: 0,
    }
  }
}

export async function previewArchiveByDate(start: string, end: string): Promise<ArchivePreview> {
  try {
    const { data, error } = await supabase.rpc('preview_archive_by_date', {
      p_start: start,
      p_end: end,
    })

    if (error) throw error
    if (data) return data as ArchivePreview

    return {
      message: 'Preview gerado com sucesso.',
      total_to_archive: 0,
      blocked_sending: 0,
      status_breakdown: {},
    }
  } catch (e) {
    console.error('Error previewing archive:', e)
    return {
      message: 'Preview gerado com fallback.',
      total_to_archive: 0,
      blocked_sending: 0,
      status_breakdown: {},
    }
  }
}

export async function archiveByDate(
  start: string,
  end: string,
): Promise<{ success: boolean; message: string; archived_count: number; blocked_count: number }> {
  try {
    const { data, error } = await supabase.rpc('archive_by_date', { p_start: start, p_end: end })
    if (error) throw error

    return {
      success: true,
      message: 'Arquivamento concluído',
      archived_count: data?.archived_count || 0,
      blocked_count: data?.blocked_count || 0,
    }
  } catch (e: any) {
    return {
      success: false,
      message: e.message || 'Erro ao arquivar',
      archived_count: 0,
      blocked_count: 0,
    }
  }
}
