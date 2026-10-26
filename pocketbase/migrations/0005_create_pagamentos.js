migrate(
  (app) => {
    const motosCol = app.findCollectionByNameOrId('motos')

    const collection = new Collection({
      name: 'pagamentos',
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
        { name: 'descricao', type: 'text', required: true },
        {
          name: 'categoria',
          type: 'select',
          required: true,
          values: ['manutencao', 'ipva_seguro', 'combustivel', 'rastreador', 'outros'],
          maxSelect: 1,
        },
        { name: 'data_vencimento', type: 'date', required: true },
        { name: 'data_pagamento', type: 'date', required: false },
        { name: 'valor', type: 'number', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pendente', 'aprovado', 'rejeitado', 'pago'],
          maxSelect: 1,
        },
        {
          name: 'lancado_por',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'lancado_por_nome', type: 'text', required: false },
        {
          name: 'aprovado_por',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'data_aprovacao', type: 'date', required: false },
        { name: 'observacoes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_pagamentos_moto ON pagamentos (moto)',
        'CREATE INDEX idx_pagamentos_status ON pagamentos (status)',
        'CREATE INDEX idx_pagamentos_data_venc ON pagamentos (data_vencimento)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pagamentos')
    app.delete(collection)
  },
)
