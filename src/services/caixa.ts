import pb from '@/lib/pocketbase/client'
import { CaixaLancamento } from '@/types/database'
import { dateToApiMidday } from '@/lib/dateUtils'

export const caixaService = {
  async getAll(): Promise<CaixaLancamento[]> {
    return await pb.collection('caixa_lancamentos').getFullList<CaixaLancamento>({
      sort: '-data,-created',
      expand: 'moto',
    })
  },

  async getByMoto(motoId: string): Promise<CaixaLancamento[]> {
    return await pb.collection('caixa_lancamentos').getFullList<CaixaLancamento>({
      filter: `moto = "${motoId}"`,
      sort: '-data,-created',
      expand: 'moto',
    })
  },

  async create(
    data: Omit<CaixaLancamento, 'id' | 'created' | 'updated'>,
  ): Promise<CaixaLancamento> {
    const payload = {
      ...data,
      data: dateToApiMidday(data.data),
    }
    return await pb.collection('caixa_lancamentos').create<CaixaLancamento>(payload)
  },

  async update(
    id: string,
    data: Partial<Omit<CaixaLancamento, 'id' | 'created' | 'updated'>>,
  ): Promise<CaixaLancamento> {
    const payload = {
      ...data,
      ...(data.data !== undefined ? { data: dateToApiMidday(data.data) } : {}),
    }
    return await pb.collection('caixa_lancamentos').update<CaixaLancamento>(id, payload)
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('caixa_lancamentos').delete(id)
  },

  async clearDemo(): Promise<void> {
    const list = await pb.collection('caixa_lancamentos').getFullList()
    for (const item of list) {
      await pb.collection('caixa_lancamentos').delete(item.id)
    }
  },
}
