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
    // Normaliza categoria para os valores aceitos pela collection caso use enum
    const validEnums = ['manutencao', 'ipva_seguro', 'combustivel', 'rastreador', 'outros']
    const enumCat = validEnums.includes(data.categoria) ? data.categoria : 'outros'
    return await pb.collection('pagamentos').create<Pagamento>({
      ...data,
      categoria: enumCat,
      categoria_nome: data.categoria_nome || data.categoria,
    })
  },

  async update(id: string, data: Partial<Pagamento>): Promise<Pagamento> {
    return await pb.collection('pagamentos').update<Pagamento>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('pagamentos').delete(id)
  },

  // Novo fluxo: A dona registra pagamento diretamente no caixa e liquida a pendência
  async pagarNoCaixa(
    pagamento: Pagamento,
    options: {
      data?: string
      formaPagamento?: 'pix' | 'dinheiro' | 'cartao' | 'transferencia' | 'outro'
      categoria?: string
      descricao?: string
      valor?: number
    } = {},
  ): Promise<Pagamento> {
    const today = options.data || new Date().toISOString().split('T')[0]
    const forma = options.formaPagamento || 'pix'
    const desc = options.descricao || `Manutenção: ${pagamento.descricao}`
    const cat = options.categoria || pagamento.categoria_nome || pagamento.categoria || 'Manutenção'
    const val = options.valor ?? pagamento.valor

    // 1. Marca pagamento como pago
    const updated = await pb.collection('pagamentos').update<Pagamento>(pagamento.id, {
      status: 'pago',
      data_pagamento: today,
    })

    // 2. Lança saída no livro caixa da moto apropriada
    await pb.collection('caixa_lancamentos').create({
      moto: pagamento.moto,
      tipo: 'saida',
      descricao: desc,
      categoria: cat,
      valor: val,
      data: today,
      forma_pagamento: forma,
    })

    return updated
  },
}
