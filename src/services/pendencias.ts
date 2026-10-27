import pb from '@/lib/pocketbase/client'
import { Pendencia } from '@/types/database'
import { dateToApiMidday } from '@/lib/dateUtils'

export const pendenciasService = {
  async getAll(): Promise<Pendencia[]> {
    return await pb.collection('pendencias').getFullList<Pendencia>({
      sort: 'feito,-created',
    })
  },

  async create(data: Partial<Pendencia>): Promise<Pendencia> {
    const payload = { ...data }
    if (payload.data) payload.data = dateToApiMidday(payload.data)
    return await pb.collection('pendencias').create<Pendencia>(payload)
  },

  async update(id: string, data: Partial<Pendencia>): Promise<Pendencia> {
    const payload = { ...data }
    if (data.data !== undefined) payload.data = data.data ? dateToApiMidday(data.data) : ''
    return await pb.collection('pendencias').update<Pendencia>(id, payload)
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
