import pb from '@/lib/pocketbase/client'
import { Moto } from '@/types/database'

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
    return await pb.collection('motos').create<Moto>(data)
  },

  async update(id: string, data: Partial<Moto>): Promise<Moto> {
    return await pb.collection('motos').update<Moto>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('motos').delete(id)
  },
}
