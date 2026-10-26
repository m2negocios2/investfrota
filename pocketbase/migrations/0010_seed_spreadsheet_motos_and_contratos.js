migrate(
  (app) => {
    const motosCol = app.findCollectionByNameOrId('motos')
    const contratosCol = app.findCollectionByNameOrId('contratos')
    const recebimentosCol = app.findCollectionByNameOrId('recebimentos')

    // Motos from owner spreadsheet
    const spreadsheetMotos = [
      {
        nome: 'VER J60',
        placa: 'VER0J60',
        modelo: 'Honda CG 160 Cargo',
        ano: 2023,
        cor: 'Branca',
        valor_diario: 41.42,
        valor_semanal: 290,
        dia: 'QUA',
        status: 'locada',
        locatario: 'José Pereira Lima',
      },
      {
        nome: 'VER B71',
        placa: 'VER1B71',
        modelo: 'Honda CG 160 Fan',
        ano: 2023,
        cor: 'Vermelha',
        valor_diario: 54.28,
        valor_semanal: 380,
        dia: 'QUA',
        status: 'locada',
        locatario: 'Bruno Henrique Silva',
      },
      {
        nome: 'G51',
        placa: 'RLS0G51',
        modelo: 'Honda CG 160 Start',
        ano: 2023,
        cor: 'Cinza',
        valor_diario: 54.28,
        valor_semanal: 380,
        dia: 'QUA',
        status: 'locada',
        locatario: 'Gabriel Souza Martins',
      },
      {
        nome: 'G91',
        placa: 'RLS0G91',
        modelo: 'Honda CG 160 Fan',
        ano: 2024,
        cor: 'Preta',
        valor_diario: 54.28,
        valor_semanal: 380,
        dia: 'SEG',
        status: 'locada',
        locatario: 'Guilherme Santos Lima',
      },
      {
        nome: 'RLS0A91',
        placa: 'RLS0A91',
        modelo: 'Honda CG 160 Titan',
        ano: 2024,
        cor: 'Azul',
        valor_diario: 114.28,
        valor_semanal: 800,
        dia: 'SEX',
        status: 'locada',
        locatario: 'André Carvalho Alves',
      },
      {
        nome: 'RLR4G71',
        placa: 'RLR4G71',
        modelo: 'Yamaha Fazer 150',
        ano: 2023,
        cor: 'Preta',
        valor_diario: 64.28,
        valor_semanal: 450,
        dia: 'SAB',
        status: 'locada',
        locatario: 'Rodrigo Medeiros Souza',
      },
      {
        nome: 'RLR4G61',
        placa: 'RLR4G61',
        modelo: 'Yamaha Factor 150',
        ano: 2023,
        cor: 'Vermelha',
        valor_diario: 57.14,
        valor_semanal: 400,
        dia: 'QUA',
        status: 'locada',
        locatario: 'Renato Oliveira Lima',
      },
      {
        nome: 'CROSSER',
        placa: 'CRS2A90',
        modelo: 'Yamaha XTZ Crosser 150',
        ano: 2023,
        cor: 'Azul',
        valor_diario: 41.42,
        valor_semanal: 290,
        dia: 'QUI',
        status: 'locada',
        locatario: 'Lucas Fernando Dias',
      },
      // Unrented / available or maintenance
      {
        nome: 'TOV9 F81',
        placa: 'TOV9F81',
        modelo: 'Honda Bros 160',
        ano: 2023,
        cor: 'Vermelha',
        valor_diario: 50,
        valor_semanal: 350,
        status: 'disponivel',
      },
      {
        nome: 'TOX6I01',
        placa: 'TOX6I01',
        modelo: 'Honda Pop 110i',
        ano: 2023,
        cor: 'Branca',
        valor_diario: 40,
        valor_semanal: 280,
        status: 'disponivel',
      },
      {
        nome: 'XXX',
        placa: 'XXX0001',
        modelo: 'Yamaha Factor 125',
        ano: 2022,
        cor: 'Preta',
        valor_diario: 35,
        valor_semanal: 245,
        status: 'manutencao',
      },
    ]

    const now = new Date()
    const oneMonthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

    for (const sm of spreadsheetMotos) {
      let motoRecord
      try {
        motoRecord = app.findFirstRecordByData('motos', 'placa', sm.placa)
      } catch (_) {
        motoRecord = new Record(motosCol)
        motoRecord.set('placa', sm.placa)
        motoRecord.set('nome', sm.nome)
        motoRecord.set('modelo', sm.modelo)
        motoRecord.set('ano', sm.ano)
        motoRecord.set('cor', sm.cor)
        motoRecord.set('valor_diario', sm.valor_diario)
        motoRecord.set('tipo_locacao_padrao', 'normal')
        motoRecord.set('status', sm.status)
        app.save(motoRecord)
      }

      // If locada and has locatario, ensure active contract
      if (sm.status === 'locada' && sm.locatario) {
        let contract
        try {
          contract = app.findFirstRecordByData('contratos', 'locatario_nome', sm.locatario)
        } catch (_) {
          contract = new Record(contratosCol)
          contract.set('moto', motoRecord.id)
          contract.set('locatario_nome', sm.locatario)
          contract.set('tipo', 'normal')
          contract.set('data_inicio', oneMonthAgo)
          contract.set('valor_diario', sm.valor_diario)
          contract.set('valor_semanal', sm.valor_semanal)
          contract.set('dia_pagamento_semana', sm.dia || 'SEG')
          contract.set('status', 'ativo')
          app.save(contract)
        }
      }
    }
  },
  (app) => {},
)
