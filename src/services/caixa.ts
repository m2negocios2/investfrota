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

  async delete(id: string): Promise<boolean> {
    return await pb.collection('caixa_lancamentos').delete(id)
  },
}
