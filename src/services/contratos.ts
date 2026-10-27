import pb from '@/lib/pocketbase/client'
import { Contrato } from '@/types/database'
import { dateToApiMidday } from '@/lib/dateUtils'

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
    if (payload.data_inicio) {
      payload.data_inicio = dateToApiMidday(payload.data_inicio)
    }
    if (payload.data_entrega) {
      payload.data_entrega = dateToApiMidday(payload.data_entrega)
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
    const payload: Partial<Contrato> = { ...data }
    if (data.data_inicio !== undefined && data.data_inicio) {
      payload.data_inicio = dateToApiMidday(data.data_inicio)
    }
    if (data.data_entrega !== undefined && data.data_entrega) {
      payload.data_entrega = dateToApiMidday(data.data_entrega)
    }
    return await pb.collection('contratos').update<Contrato>(id, payload)
  },

  async finalizar(id: string, motoId: string, dataFim?: string): Promise<Contrato> {
    const updatePayload: Partial<Contrato> = {
      status: 'finalizado',
    }
    if (dataFim) {
      updatePayload.data_entrega = dateToApiMidday(dataFim)
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
    // Obter dados do contrato antes de apagar (para locatario_nome, motoId, etc.)
    let targetContrato: Contrato | null = null
    try {
      targetContrato = await pb.collection('contratos').getOne<Contrato>(id)
    } catch (err) {
      console.warn('Contrato já não encontrado ou erro ao carregar:', err)
    }

    const locatarioNome = targetContrato?.locatario_nome?.trim()
    const finalMotoId = motoId || targetContrato?.moto

    // 1. Apagar TODOS os recebimentos vinculados a este contrato
    try {
      const recs = await pb.collection('recebimentos').getFullList({
        filter: `contrato = "${id}"`,
      })
      for (const rec of recs) {
        try {
          await pb.collection('recebimentos').delete(rec.id)
        } catch (errDelRec) {
          console.warn('Aviso ao apagar recebimento vinculado:', errDelRec)
        }
      }
    } catch (err) {
      console.warn('Aviso ao buscar recebimentos do contrato:', err)
    }

    // Nota: O Livro Caixa é o registro contábil e financeiro oficial e NUNCA deve sofrer
    // exclusão em massa por nome de cliente ao excluir um contrato cancelado/duplicado,
    // pois isso causava a perda de lançamentos de caixa legítimos e confirmados.
    // Lançamentos no caixa devem ser editados ou excluídos diretamente pelo usuário na tela /caixa.

    // 3. Apagar o registro do contrato
    await pb.collection('contratos').delete(id)

    // 4. Se foi passado o motoId (ou obtido do contrato), reavaliar status da moto
    if (finalMotoId) {
      try {
        const active = await pb.collection('contratos').getList(1, 1, {
          filter: `moto = "${finalMotoId}" && status = "ativo" && id != "${id}"`,
        })
        if (active.totalItems === 0) {
          const motoAtual = await pb.collection('motos').getOne(finalMotoId)
          if (motoAtual.status === 'locada') {
            await pb.collection('motos').update(finalMotoId, { status: 'disponivel' })
          }
        }
      } catch (err) {
        console.warn('Aviso ao atualizar status da moto após exclusão do contrato:', err)
      }
    }

    return true
  },
}
