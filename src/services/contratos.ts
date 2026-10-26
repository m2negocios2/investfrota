import pb from '@/lib/pocketbase/client'
import { Contrato } from '@/types/database'

export const contratosService = {
  async getAll(): Promise<Contrato[]> {
    return await pb.collection('contratos').getFullList<Contrato>({
      sort: '-created',
      expand: 'moto',
    })
  },

  async getByMoto(motoId: string): Promise<Contrato[]> {
    return await pb.collection('contratos').getFullList<Contrato>({
      filter: `moto = "${motoId}"`,
      sort: '-data_inicio',
      expand: 'moto',
    })
  },

  async create(data: Omit<Contrato, 'id' | 'created' | 'updated'>): Promise<Contrato> {
    const record = await pb.collection('contratos').create<Contrato>(data)
    // If contract is active, update moto status to locada
    if (data.status === 'ativo') {
      await pb.collection('motos').update(data.moto, { status: 'locada' })
    }
    return record
  },

  async update(id: string, data: Partial<Contrato>): Promise<Contrato> {
    return await pb.collection('contratos').update<Contrato>(id, data)
  },

  async finalizar(id: string, motoId: string): Promise<Contrato> {
    const updated = await pb.collection('contratos').update<Contrato>(id, { status: 'finalizado' })
    // If no other active contracts for this moto, set status to disponivel
    const active = await pb.collection('contratos').getList(1, 1, {
      filter: `moto = "${motoId}" && status = "ativo" && id != "${id}"`,
    })
    if (active.totalItems === 0) {
      await pb.collection('motos').update(motoId, { status: 'disponivel' })
    }
    return updated
  },
}
