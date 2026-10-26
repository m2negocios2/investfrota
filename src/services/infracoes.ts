import pb from '@/lib/pocketbase/client'
import { Infracao } from '@/types/database'

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
    return await pb.collection('infracoes').create<Infracao>(data, {
      expand: 'moto',
    })
  },

  async update(id: string, data: Partial<Infracao>): Promise<Infracao> {
    return await pb.collection('infracoes').update<Infracao>(id, data, {
      expand: 'moto',
    })
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('infracoes').delete(id)
  },
}
