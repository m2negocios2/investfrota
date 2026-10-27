import pb from '@/lib/pocketbase/client'
import { Caucao } from '@/types/database'
import { dateToApiMidday } from '@/lib/dateUtils'

export const caucoesService = {
  async getAll(): Promise<Caucao[]> {
    return await pb.collection('caucoes').getFullList<Caucao>({
      sort: '-data',
      expand: 'moto',
    })
  },

  async getByMoto(motoId: string): Promise<Caucao[]> {
    return await pb.collection('caucoes').getFullList<Caucao>({
      filter: `moto = "${motoId}"`,
      sort: '-data',
      expand: 'moto',
    })
  },

  async create(data: Omit<Caucao, 'id' | 'created' | 'updated'>): Promise<Caucao> {
    const payload = {
      ...data,
      data: dateToApiMidday(data.data),
      data_devolucao: data.data_devolucao ? dateToApiMidday(data.data_devolucao) : undefined,
    }
    return await pb.collection('caucoes').create<Caucao>(payload)
  },

  async update(id: string, data: Partial<Caucao>): Promise<Caucao> {
    const payload = { ...data }
    if (data.data !== undefined) payload.data = dateToApiMidday(data.data)
    if (data.data_devolucao !== undefined)
      payload.data_devolucao = data.data_devolucao ? dateToApiMidday(data.data_devolucao) : ''
    return await pb.collection('caucoes').update<Caucao>(id, payload)
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('caucoes').delete(id)
  },
}
