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

    // 2. Apagar lançamentos de caixa gerados por recebimento de aluguel deste contrato/locatário
    if (finalMotoId && locatarioNome) {
      try {
        // Formato padrão gerado em recebimentosService: "Recebimento de aluguel - {locatarioNome}"
        const descSearch = `Recebimento de aluguel - ${locatarioNome}`
        const lancamentos = await pb.collection('caixa_lancamentos').getFullList({
          filter: `moto = "${finalMotoId}" && tipo = "entrada" && categoria = "aluguel" && descricao ~ "${locatarioNome}"`,
        })
        for (const lanc of lancamentos) {
          if (lanc.descricao === descSearch || lanc.descricao?.includes(locatarioNome)) {
            try {
              await pb.collection('caixa_lancamentos').delete(lanc.id)
            } catch (errDelCaixa) {
              console.warn('Aviso ao apagar lançamento de caixa do contrato:', errDelCaixa)
            }
          }
        }
      } catch (err) {
        console.warn('Aviso ao buscar lançamentos de caixa vinculados ao contrato:', err)
      }
    }

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
