import pb from '@/lib/pocketbase/client'
import { Recebimento } from '@/types/database'

export const recebimentosService = {
  async getAll(): Promise<Recebimento[]> {
    return await pb.collection('recebimentos').getFullList<Recebimento>({
      sort: '-data_vencimento',
      expand: 'moto,contrato',
    })
  },

  async getByMoto(motoId: string): Promise<Recebimento[]> {
    return await pb.collection('recebimentos').getFullList<Recebimento>({
      filter: `moto = "${motoId}"`,
      sort: '-data_vencimento',
      expand: 'moto,contrato',
    })
  },

  async create(data: Omit<Recebimento, 'id' | 'created' | 'updated'>): Promise<Recebimento> {
    return await pb.collection('recebimentos').create<Recebimento>(data)
  },

  async update(id: string, data: Partial<Recebimento>): Promise<Recebimento> {
    return await pb.collection('recebimentos').update<Recebimento>(id, data)
  },

  async marcarComoPago(
    id: string,
    motoId: string,
    valor: number,
    locatarioNome: string,
    formaPagamento: 'pix' | 'dinheiro' | 'cartao' | 'transferencia' = 'pix',
  ): Promise<Recebimento> {
    const today = new Date().toISOString().split('T')[0]
    const updated = await pb.collection('recebimentos').update<Recebimento>(id, {
      status: 'pago',
      data_pagamento: today,
      forma_pagamento: formaPagamento,
    })

    // Also register in Caixa
    await pb.collection('caixa_lancamentos').create({
      moto: motoId,
      tipo: 'entrada',
      descricao: `Recebimento de aluguel - ${locatarioNome}`,
      categoria: 'aluguel',
      valor: valor,
      data: today,
      forma_pagamento: formaPagamento,
    })

    return updated
  },

  async estornarPagamento(
    id: string,
    novoStatus: 'em_dia' | 'em_atraso' = 'em_dia',
  ): Promise<Recebimento> {
    const updated = await pb.collection('recebimentos').update<Recebimento>(id, {
      status: novoStatus,
      data_pagamento: '',
      forma_pagamento: '' as any,
    })
    return updated
  },
}
