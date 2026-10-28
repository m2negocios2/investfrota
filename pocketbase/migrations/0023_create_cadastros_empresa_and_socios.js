migrate(
  (app) => {
    // 1. Coleção empresa_config (dados da empresa, nome editável)
    const empresaCol = new Collection({
      name: 'empresa_config',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome_empresa', type: 'text', required: true },
        { name: 'documento', type: 'text', required: false },
        { name: 'telefone', type: 'text', required: false },
        { name: 'email', type: 'text', required: false },
        { name: 'observacoes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(empresaCol)

    // Semente inicial para a empresa
    try {
      const rec = new Record(empresaCol)
      rec.set('nome_empresa', 'M2 Gestão de Motos')
      rec.set('observacoes', 'Controle de Frotas e Locação de Motos')
      app.save(rec)
    } catch (e) {
      console.log('Aviso ao semear empresa_config:', e)
    }

    // 2. Coleção socios (lista editável de sócios: adicionar, editar, remover)
    const sociosCol = new Collection({
      name: 'socios',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'funcao', type: 'text', required: false },
        { name: 'participacao_percentual', type: 'number', required: false },
        { name: 'telefone', type: 'text', required: false },
        { name: 'email', type: 'text', required: false },
        { name: 'observacao', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_socios_nome ON socios (nome)'],
    })
    app.save(sociosCol)
  },
  (app) => {
    try {
      const sociosCol = app.findCollectionByNameOrId('socios')
      app.delete(sociosCol)
    } catch (_) {}
    try {
      const empresaCol = app.findCollectionByNameOrId('empresa_config')
      app.delete(empresaCol)
    } catch (_) {}
  },
)
