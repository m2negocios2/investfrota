migrate(
  (app) => {
    const motosCol = app.findCollectionByNameOrId('motos')
    const contratosCol = app.findCollectionByNameOrId('contratos')

    const collection = new Collection({
      name: 'recebimentos',
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
        {
          name: 'contrato',
          type: 'relation',
          required: false,
          collectionId: contratosCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'locatario_nome', type: 'text', required: true },
        { name: 'data_vencimento', type: 'date', required: true },
        { name: 'data_pagamento', type: 'date', required: false },
        { name: 'valor', type: 'number', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['em_dia', 'em_atraso', 'pago'],
          maxSelect: 1,
        },
        {
          name: 'forma_pagamento',
          type: 'select',
          required: false,
          values: ['pix', 'dinheiro', 'cartao', 'transferencia'],
          maxSelect: 1,
        },
        { name: 'observacoes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_recebimentos_moto ON recebimentos (moto)',
        'CREATE INDEX idx_recebimentos_status ON recebimentos (status)',
        'CREATE INDEX idx_recebimentos_data_venc ON recebimentos (data_vencimento)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('recebimentos')
    app.delete(collection)
  },
)
