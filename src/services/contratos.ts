import pb from '@/lib/pocketbase/client'
import { Contrato } from '@/types/database'

export const contratosService = {
  async getAll(): Promise<Contrato[]> {
    return await pb.collection('contratos').getFullList<Contrato>({
      sort: '-created',
      expand: 'moto',
    })
  },

  async getByMoto(motoId: string): Promise<Contrato[]> {
    return await pb.collection('contratos').getFullList<Contrato>({
      filter: `moto = "${motoId}"`,
      sort: '-data_inicio',
      expand: 'moto',
    })
  },

  async create(data: Omit<Contrato, 'id' | 'created' | 'updated'>): Promise<Contrato> {
    // If dia_pagamento_semana is not set, derive from data_inicio
    const payload = { ...data }
    if (!payload.dia_pagamento_semana && payload.data_inicio) {
      const dt = new Date(payload.data_inicio)
      const daysMap: Array<'DOM' | 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB'> = [
        'DOM',
        'SEG',
        'TER',
        'QUA',
        'QUI',
        'SEX',
        'SAB',
      ]
      payload.dia_pagamento_semana = daysMap[dt.getUTCDay()] || 'SEG'
    }
    const record = await pb.collection('contratos').create<Contrato>(payload)
    // If contract is active, update moto status to locada
    if (data.status === 'ativo') {
      await pb.collection('motos').update(data.moto, { status: 'locada' })
    }
    return record
  },

  async updateDiaSemana(
    id: string,
    dia: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM',
  ): Promise<Contrato> {
    return await pb.collection('contratos').update<Contrato>(id, { dia_pagamento_semana: dia })
  },

  async update(id: string, data: Partial<Contrato>): Promise<Contrato> {
    return await pb.collection('contratos').update<Contrato>(id, data)
  },

  async finalizar(id: string, motoId: string, dataFim?: string): Promise<Contrato> {
    const updatePayload: Partial<Contrato> = {
      status: 'finalizado',
    }
    if (dataFim) {
      updatePayload.data_entrega = dataFim
    }
    const updated = await pb.collection('contratos').update<Contrato>(id, updatePayload)
    // If no other active contracts for this moto, set status to disponivel
    const active = await pb.collection('contratos').getList(1, 1, {
      filter: `moto = "${motoId}" && status = "ativo" && id != "${id}"`,
    })
    if (active.totalItems === 0) {
      await pb.collection('motos').update(motoId, { status: 'disponivel' })
    }
    return updated
  },

  async delete(id: string, motoId?: string): Promise<boolean> {
    // 1. Desvincular recebimentos associados a este contrato para não dar conflito de chave estrangeira
    try {
      const recs = await pb.collection('recebimentos').getFullList({
        filter: `contrato = "${id}"`,
      })
      for (const rec of recs) {
        await pb.collection('recebimentos').update(rec.id, { contrato: null })
      }
    } catch (err) {
      console.warn('Aviso ao desvincular recebimentos do contrato:', err)
    }

    // 2. Apagar o registro do contrato
    await pb.collection('contratos').delete(id)

    // 3. Se foi passado o motoId (ou se conseguirmos checar), reavaliar status da moto
    if (motoId) {
      try {
        const active = await pb.collection('contratos').getList(1, 1, {
          filter: `moto = "${motoId}" && status = "ativo"`,
        })
        if (active.totalItems === 0) {
          const motoAtual = await pb.collection('motos').getOne(motoId)
          if (motoAtual.status === 'locada') {
            await pb.collection('motos').update(motoId, { status: 'disponivel' })
          }
        }
      } catch (err) {
        console.warn('Aviso ao atualizar status da moto após exclusão do contrato:', err)
      }
    }

    return true
  },
}
