migrate(
  (app) => {
    const motosCol = app.findCollectionByNameOrId('motos')

    const collection = new Collection({
      name: 'contratos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'moto',
          type: 'relation',
          required: true,
          collectionId: motosCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'locatario_nome', type: 'text', required: true },
        { name: 'locatario_documento', type: 'text', required: false },
        { name: 'locatario_telefone', type: 'text', required: false },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['normal', 'plano_conquista'],
          maxSelect: 1,
        },
        { name: 'data_inicio', type: 'date', required: true },
        { name: 'prazo_meses', type: 'number', required: false },
        { name: 'data_entrega', type: 'date', required: false },
        { name: 'valor_diario', type: 'number', required: true },
        { name: 'valor_semanal', type: 'number', required: false },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativo', 'finalizado', 'cancelado'],
          maxSelect: 1,
        },
        { name: 'observacoes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_contratos_moto ON contratos (moto)',
        'CREATE INDEX idx_contratos_status ON contratos (status)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('contratos')
    app.delete(collection)
  },
)
