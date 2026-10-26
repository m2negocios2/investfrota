migrate(
  (app) => {
    const motosCol = app.findCollectionByNameOrId('motos')

    const collection = new Collection({
      name: 'caixa_lancamentos',
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
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['entrada', 'saida'],
          maxSelect: 1,
        },
        { name: 'descricao', type: 'text', required: true },
        { name: 'categoria', type: 'text', required: false },
        { name: 'valor', type: 'number', required: true },
        { name: 'data', type: 'date', required: true },
        {
          name: 'forma_pagamento',
          type: 'select',
          required: false,
          values: ['pix', 'dinheiro', 'cartao', 'transferencia', 'outro'],
          maxSelect: 1,
        },
        { name: 'observacoes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_caixa_moto ON caixa_lancamentos (moto)',
        'CREATE INDEX idx_caixa_tipo ON caixa_lancamentos (tipo)',
        'CREATE INDEX idx_caixa_data ON caixa_lancamentos (data)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('caixa_lancamentos')
    app.delete(collection)
  },
)
