import pb from '@/lib/pocketbase/client'
import { Pagamento } from '@/types/database'

export const pagamentosService = {
  async getAll(): Promise<Pagamento[]> {
    return await pb.collection('pagamentos').getFullList<Pagamento>({
      sort: '-data_vencimento',
      expand: 'moto,lancado_por,aprovado_por',
    })
  },

  async getPendentes(): Promise<Pagamento[]> {
    return await pb.collection('pagamentos').getFullList<Pagamento>({
      filter: 'status = "pendente"',
      sort: 'data_vencimento',
      expand: 'moto,lancado_por',
    })
  },

  async getByMoto(motoId: string): Promise<Pagamento[]> {
    return await pb.collection('pagamentos').getFullList<Pagamento>({
      filter: `moto = "${motoId}"`,
      sort: '-data_vencimento',
      expand: 'moto,lancado_por,aprovado_por',
    })
  },

  async create(data: Omit<Pagamento, 'id' | 'created' | 'updated'>): Promise<Pagamento> {
    return await pb.collection('pagamentos').create<Pagamento>(data)
  },

  async update(id: string, data: Partial<Pagamento>): Promise<Pagamento> {
    return await pb.collection('pagamentos').update<Pagamento>(id, data)
  },

  async aprovar(id: string, proprietarioId: string): Promise<Pagamento> {
    const today = new Date().toISOString().split('T')[0]
    return await pb.collection('pagamentos').update<Pagamento>(id, {
      status: 'aprovado',
      aprovado_por: proprietarioId,
      data_aprovacao: today,
    })
  },

  async rejeitar(id: string): Promise<Pagamento> {
    return await pb.collection('pagamentos').update<Pagamento>(id, {
      status: 'rejeitado',
    })
  },

  async pagar(
    pagamento: Pagamento,
    formaPagamento: 'pix' | 'dinheiro' | 'cartao' | 'transferencia' | 'outro' = 'pix',
  ): Promise<Pagamento> {
    const today = new Date().toISOString().split('T')[0]
    const updated = await pb.collection('pagamentos').update<Pagamento>(pagamento.id, {
      status: 'pago',
      data_pagamento: today,
    })

    // Also register in Caixa
    await pb.collection('caixa_lancamentos').create({
      moto: pagamento.moto,
      tipo: 'saida',
      descricao: `Pagamento: ${pagamento.descricao}`,
      categoria: pagamento.categoria,
      valor: pagamento.valor,
      data: today,
      forma_pagamento: formaPagamento,
    })

    return updated
  },
}
