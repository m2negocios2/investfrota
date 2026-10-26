import pb from '@/lib/pocketbase/client'
import { Pendencia } from '@/types/database'

export const pendenciasService = {
  async getAll(): Promise<Pendencia[]> {
    return await pb.collection('pendencias').getFullList<Pendencia>({
      sort: 'feito,-created',
    })
  },

  async create(data: Partial<Pendencia>): Promise<Pendencia> {
    return await pb.collection('pendencias').create<Pendencia>(data)
  },

  async update(id: string, data: Partial<Pendencia>): Promise<Pendencia> {
    return await pb.collection('pendencias').update<Pendencia>(id, data)
  },

  async toggleFeito(id: string, feitoAtual: boolean): Promise<Pendencia> {
    return await pb.collection('pendencias').update<Pendencia>(id, {
      feito: !feitoAtual,
    })
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('pendencias').delete(id)
  },
}
