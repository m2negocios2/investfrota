import pb from '@/lib/pocketbase/client'
import { EmpresaConfig, Socio } from '@/types/database'

export const empresaService = {
  async get(): Promise<EmpresaConfig | null> {
    try {
      const records = await pb.collection('empresa_config').getList<EmpresaConfig>(1, 1, {
        sort: 'created',
      })
      if (records.items.length > 0) {
        return records.items[0]
      }
      return null
    } catch (err) {
      console.error('Erro ao buscar empresa_config:', err)
      return null
    }
  },

  async updateOrCreate(
    id: string | null | undefined,
    data: Partial<Omit<EmpresaConfig, 'id' | 'created' | 'updated'>>,
  ): Promise<EmpresaConfig> {
    if (id) {
      return await pb.collection('empresa_config').update<EmpresaConfig>(id, data)
    }

    // Se já houver um registro existente, atualiza ele em vez de duplicar
    const existing = await this.get()
    if (existing) {
      return await pb.collection('empresa_config').update<EmpresaConfig>(existing.id, data)
    }

    return await pb.collection('empresa_config').create<EmpresaConfig>({
      nome_empresa: data.nome_empresa || 'M2 Gestão de Motos',
      ...data,
    })
  },
}

export const sociosService = {
  async getAll(): Promise<Socio[]> {
    try {
      return await pb.collection('socios').getFullList<Socio>({
        sort: 'nome',
      })
    } catch (err) {
      console.error('Erro ao buscar socios:', err)
      return []
    }
  },

  async create(data: Omit<Socio, 'id' | 'created' | 'updated'>): Promise<Socio> {
    return await pb.collection('socios').create<Socio>(data)
  },

  async update(
    id: string,
    data: Partial<Omit<Socio, 'id' | 'created' | 'updated'>>,
  ): Promise<Socio> {
    return await pb.collection('socios').update<Socio>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('socios').delete(id)
  },
}
