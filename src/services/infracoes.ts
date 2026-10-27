import pb from '@/lib/pocketbase/client'
import { Infracao } from '@/types/database'
import { dateToApiMidday } from '@/lib/dateUtils'

export const infracoesService = {
  async getAll(): Promise<Infracao[]> {
    return await pb.collection('infracoes').getFullList<Infracao>({
      sort: '-created',
      expand: 'moto',
    })
  },

  async getByMoto(motoId: string): Promise<Infracao[]> {
    return await pb.collection('infracoes').getFullList<Infracao>({
      filter: `moto = "${motoId}"`,
      sort: 'numero,created',
      expand: 'moto',
    })
  },

  async getPendentes(): Promise<Infracao[]> {
    return await pb.collection('infracoes').getFullList<Infracao>({
      filter: 'status_pagamento = "pendente"',
      sort: '-created',
      expand: 'moto',
    })
  },

  async create(data: Partial<Infracao>): Promise<Infracao> {
    const payload = { ...data }
    if (payload.data) payload.data = dateToApiMidday(payload.data)
    if (payload.data_pagamento) payload.data_pagamento = dateToApiMidday(payload.data_pagamento)
    if (payload.data_entrada_detran)
      payload.data_entrada_detran = dateToApiMidday(payload.data_entrada_detran)
    if (payload.prazo) payload.prazo = dateToApiMidday(payload.prazo)

    return await pb.collection('infracoes').create<Infracao>(payload, {
      expand: 'moto',
    })
  },

  async update(id: string, data: Partial<Infracao>): Promise<Infracao> {
    const payload = { ...data }
    if (data.data !== undefined) payload.data = data.data ? dateToApiMidday(data.data) : ''
    if (data.data_pagamento !== undefined)
      payload.data_pagamento = data.data_pagamento ? dateToApiMidday(data.data_pagamento) : ''
    if (data.data_entrada_detran !== undefined)
      payload.data_entrada_detran = data.data_entrada_detran
        ? dateToApiMidday(data.data_entrada_detran)
        : ''
    if (data.prazo !== undefined) payload.prazo = data.prazo ? dateToApiMidday(data.prazo) : ''

    return await pb.collection('infracoes').update<Infracao>(id, payload, {
      expand: 'moto',
    })
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('infracoes').delete(id)
  },
}
