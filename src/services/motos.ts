import pb from '@/lib/pocketbase/client'
import { Moto } from '@/types/database'
import { dateToApiMidday } from '@/lib/dateUtils'

export const motosService = {
  async getAll(): Promise<Moto[]> {
    return await pb.collection('motos').getFullList<Moto>({
      sort: '-created',
    })
  },

  async getById(id: string): Promise<Moto> {
    return await pb.collection('motos').getOne<Moto>(id)
  },

  async create(data: Omit<Moto, 'id' | 'created' | 'updated'>): Promise<Moto> {
    const payload = { ...data }
    if (payload.data_compra) {
      payload.data_compra = dateToApiMidday(payload.data_compra)
    }
    return await pb.collection('motos').create<Moto>(payload)
  },

  async update(id: string, data: Partial<Moto>): Promise<Moto> {
    const payload = { ...data }
    if (payload.data_compra !== undefined && payload.data_compra) {
      payload.data_compra = dateToApiMidday(payload.data_compra)
    }
    return await pb.collection('motos').update<Moto>(id, payload)
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('motos').delete(id)
  },
}
