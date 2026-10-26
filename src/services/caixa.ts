import pb from '@/lib/pocketbase/client'
import { CaixaLancamento } from '@/types/database'

export const caixaService = {
  async getAll(): Promise<CaixaLancamento[]> {
    return await pb.collection('caixa_lancamentos').getFullList<CaixaLancamento>({
      sort: '-data',
      expand: 'moto',
    })
  },

  async getByMoto(motoId: string): Promise<CaixaLancamento[]> {
    return await pb.collection('caixa_lancamentos').getFullList<CaixaLancamento>({
      filter: `moto = "${motoId}"`,
      sort: '-data',
      expand: 'moto',
    })
  },

  async create(
    data: Omit<CaixaLancamento, 'id' | 'created' | 'updated'>,
  ): Promise<CaixaLancamento> {
    return await pb.collection('caixa_lancamentos').create<CaixaLancamento>(data)
  },

  async update(
    id: string,
    data: Partial<Omit<CaixaLancamento, 'id' | 'created' | 'updated'>>,
  ): Promise<CaixaLancamento> {
    return await pb.collection('caixa_lancamentos').update<CaixaLancamento>(id, data)
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
