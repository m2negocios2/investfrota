import pb from '@/lib/pocketbase/client'
import { CategoriaGasto } from '@/types/database'

export const categoriasService = {
  async getAll(): Promise<CategoriaGasto[]> {
    try {
      return await pb.collection('categorias_gastos').getFullList<CategoriaGasto>({
        sort: 'nome',
      })
    } catch (err) {
      console.warn('Erro ao carregar categorias do banco, usando fallback:', err)
      return [
        {
          id: 'cat-1',
          nome: 'Manutenção',
          descricao: 'Oficina, trocas de óleo e peças',
          created: '',
          updated: '',
        },
        {
          id: 'cat-2',
          nome: 'Combustível',
          descricao: 'Gasolina e abastecimentos',
          created: '',
          updated: '',
        },
        {
          id: 'cat-3',
          nome: 'Documentação',
          descricao: 'IPVA e licenciamento',
          created: '',
          updated: '',
        },
        {
          id: 'cat-4',
          nome: 'SEGURANÇA',
          descricao: 'Seguro contra terceiros, furto e roubo',
          created: '',
          updated: '',
        },
        {
          id: 'cat-5',
          nome: 'Rastreador GPS',
          descricao: 'Monitoramento',
          created: '',
          updated: '',
        },
        {
          id: 'cat-6',
          nome: 'Peças & Acessórios',
          descricao: 'Acessórios e reposição',
          created: '',
          updated: '',
        },
        { id: 'cat-7', nome: 'Outros', descricao: 'Despesas diversas', created: '', updated: '' },
      ]
    }
  },

  async create(data: { nome: string; descricao?: string; cor?: string }): Promise<CategoriaGasto> {
    return await pb.collection('categorias_gastos').create<CategoriaGasto>(data)
  },

  async update(id: string, data: Partial<CategoriaGasto>): Promise<CategoriaGasto> {
    return await pb.collection('categorias_gastos').update<CategoriaGasto>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('categorias_gastos').delete(id)
  },
}
