import pb from '@/lib/pocketbase/client'
import { Caucao } from '@/types/database'

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
    return await pb.collection('caucoes').create<Caucao>(data)
  },

  async update(id: string, data: Partial<Caucao>): Promise<Caucao> {
    return await pb.collection('caucoes').update<Caucao>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('caucoes').delete(id)
  },
}
