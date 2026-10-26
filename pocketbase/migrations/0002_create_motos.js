migrate(
  (app) => {
    const collection = new Collection({
      name: 'motos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'placa', type: 'text', required: true },
        { name: 'modelo', type: 'text', required: true },
        { name: 'ano', type: 'number', required: true },
        { name: 'cor', type: 'text', required: true },
        { name: 'valor_diario', type: 'number', required: true },
        {
          name: 'tipo_locacao_padrao',
          type: 'select',
          required: true,
          values: ['normal', 'plano_conquista'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: false,
          values: ['disponivel', 'locada', 'manutencao'],
          maxSelect: 1,
        },
        { name: 'observacoes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_motos_placa ON motos (placa)'],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('motos')
    app.delete(collection)
  },
)
