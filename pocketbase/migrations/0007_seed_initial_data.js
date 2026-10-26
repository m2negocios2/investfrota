migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Seed or update main user (m2.negocios2@gmail.com) as proprietario
    try {
      const existing = app.findAuthRecordByEmail('_pb_users_auth_', 'm2.negocios2@gmail.com')
      existing.set('role', 'proprietario')
      existing.set('name', 'Proprietário M2')
      existing.setVerified(true)
      app.save(existing)
    } catch (_) {
      const record = new Record(users)
      record.setEmail('m2.negocios2@gmail.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Proprietário M2')
      record.set('role', 'proprietario')
      app.save(record)
    }

    // 2. Seed an administrator account for testing roles
    try {
      const existingAdmin = app.findAuthRecordByEmail('_pb_users_auth_', 'admin@motos.com')
      existingAdmin.set('role', 'administrador')
      existingAdmin.set('name', 'Administrador Operacional')
      existingAdmin.setVerified(true)
      app.save(existingAdmin)
    } catch (_) {
      const record = new Record(users)
      record.setEmail('admin@motos.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Administrador Operacional')
      record.set('role', 'administrador')
      app.save(record)
    }

    // 3. Seed sample Motos
    const motosCol = app.findCollectionByNameOrId('motos')
    const contratosCol = app.findCollectionByNameOrId('contratos')
    const recebimentosCol = app.findCollectionByNameOrId('recebimentos')
    const pagamentosCol = app.findCollectionByNameOrId('pagamentos')
    const caixaCol = app.findCollectionByNameOrId('caixa_lancamentos')

    let moto1, moto2, moto3, moto4

    try {
      moto1 = app.findFirstRecordByData('motos', 'placa', 'BRA2E19')
    } catch (_) {
      moto1 = new Record(motosCol)
      moto1.set('placa', 'BRA2E19')
      moto1.set('modelo', 'Honda CG 160 Start')
      moto1.set('ano', 2023)
      moto1.set('cor', 'Vermelha')
      moto1.set('valor_diario', 35)
      moto1.set('tipo_locacao_padrao', 'normal')
      moto1.set('status', 'locada')
      moto1.set('observacoes', 'Revisão de 10.000 km realizada em dia.')
      app.save(moto1)
    }

    try {
      moto2 = app.findFirstRecordByData('motos', 'placa', 'SPX4B88')
    } catch (_) {
      moto2 = new Record(motosCol)
      moto2.set('placa', 'SPX4B88')
      moto2.set('modelo', 'Yamaha Factor 150')
      moto2.set('ano', 2024)
      moto2.set('cor', 'Preta')
      moto2.set('valor_diario', 40)
      moto2.set('tipo_locacao_padrao', 'plano_conquista')
      moto2.set('status', 'locada')
      moto2.set('observacoes', 'Contrato com opção de compra final.')
      app.save(moto2)
    }

    try {
      moto3 = app.findFirstRecordByData('motos', 'placa', 'RTO9K21')
    } catch (_) {
      moto3 = new Record(motosCol)
      moto3.set('placa', 'RTO9K21')
      moto3.set('modelo', 'Honda Bros 160')
      moto3.set('ano', 2022)
      moto3.set('cor', 'Azul')
      moto3.set('valor_diario', 45)
      moto3.set('tipo_locacao_padrao', 'normal')
      moto3.set('status', 'disponivel')
      moto3.set('observacoes', 'Pronta para novo aluguel.')
      app.save(moto3)
    }

    try {
      moto4 = app.findFirstRecordByData('motos', 'placa', 'MTO7J50')
    } catch (_) {
      moto4 = new Record(motosCol)
      moto4.set('placa', 'MTO7J50')
      moto4.set('modelo', 'Honda Pop 110i')
      moto4.set('ano', 2023)
      moto4.set('cor', 'Branca')
      moto4.set('valor_diario', 28)
      moto4.set('tipo_locacao_padrao', 'normal')
      moto4.set('status', 'manutencao')
      moto4.set('observacoes', 'Na oficina trocando relação e pastilha.')
      app.save(moto4)
    }

    // 4. Seed Contratos
    let contrato1, contrato2
    const today = new Date().toISOString().split('T')[0]
    const sixMonthsLater = new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0]
    const oneMonthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

    try {
      contrato1 = app.findFirstRecordByData('contratos', 'locatario_nome', 'Carlos Eduardo Silva')
    } catch (_) {
      contrato1 = new Record(contratosCol)
      contrato1.set('moto', moto1.id)
      contrato1.set('locatario_nome', 'Carlos Eduardo Silva')
      contrato1.set('locatario_documento', '392.481.920-44')
      contrato1.set('locatario_telefone', '(11) 98765-4321')
      contrato1.set('tipo', 'normal')
      contrato1.set('data_inicio', oneMonthAgo)
      contrato1.set('valor_diario', 35)
      contrato1.set('valor_semanal', 245)
      contrato1.set('status', 'ativo')
      contrato1.set('observacoes', 'Locação recorrente semanal.')
      app.save(contrato1)
    }

    try {
      contrato2 = app.findFirstRecordByData('contratos', 'locatario_nome', 'Marcos Vinicius Santos')
    } catch (_) {
      contrato2 = new Record(contratosCol)
      contrato2.set('moto', moto2.id)
      contrato2.set('locatario_nome', 'Marcos Vinicius Santos')
      contrato2.set('locatario_documento', '455.192.304-12')
      contrato2.set('locatario_telefone', '(11) 97123-8890')
      contrato2.set('tipo', 'plano_conquista')
      contrato2.set('data_inicio', oneMonthAgo)
      contrato2.set('prazo_meses', 18)
      contrato2.set('data_entrega', sixMonthsLater)
      contrato2.set('valor_diario', 40)
      contrato2.set('valor_semanal', 280)
      contrato2.set('status', 'ativo')
      contrato2.set('observacoes', 'Plano conquista com quitação final.')
      app.save(contrato2)
    }

    // 5. Seed Recebimentos
    const nextWeek = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
    const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const overdueDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]

    try {
      app.findFirstRecordByData('recebimentos', 'locatario_nome', 'Carlos Eduardo Silva')
    } catch (_) {
      // Pago
      const r1 = new Record(recebimentosCol)
      r1.set('moto', moto1.id)
      r1.set('contrato', contrato1.id)
      r1.set('locatario_nome', 'Carlos Eduardo Silva')
      r1.set('data_vencimento', lastWeek)
      r1.set('data_pagamento', lastWeek)
      r1.set('valor', 245)
      r1.set('status', 'pago')
      r1.set('forma_pagamento', 'pix')
      app.save(r1)

      // Em dia (próximo vencimento)
      const r2 = new Record(recebimentosCol)
      r2.set('moto', moto1.id)
      r2.set('contrato', contrato1.id)
      r2.set('locatario_nome', 'Carlos Eduardo Silva')
      r2.set('data_vencimento', nextWeek)
      r2.set('valor', 245)
      r2.set('status', 'em_dia')
      app.save(r2)

      // Em atraso
      const r3 = new Record(recebimentosCol)
      r3.set('moto', moto2.id)
      r3.set('contrato', contrato2.id)
      r3.set('locatario_nome', 'Marcos Vinicius Santos')
      r3.set('data_vencimento', overdueDate)
      r3.set('valor', 280)
      r3.set('status', 'em_atraso')
      r3.set('observacoes', 'Aguardando comprovante via PIX.')
      app.save(r3)
    }

    // 6. Seed Pagamentos / Contas a pagar
    try {
      app.findFirstRecordByData('pagamentos', 'descricao', 'Troca de óleo e filtro')
    } catch (_) {
      const p1 = new Record(pagamentosCol)
      p1.set('moto', moto1.id)
      p1.set('descricao', 'Troca de óleo e filtro')
      p1.set('categoria', 'manutencao')
      p1.set('data_vencimento', lastWeek)
      p1.set('data_pagamento', lastWeek)
      p1.set('valor', 65)
      p1.set('status', 'pago')
      p1.set('lancado_por_nome', 'Administrador Operacional')
      app.save(p1)

      const p2 = new Record(pagamentosCol)
      p2.set('moto', moto4.id)
      p2.set('descricao', 'Substituição do kit relação e lona traseira')
      p2.set('categoria', 'manutencao')
      p2.set('data_vencimento', today)
      p2.set('valor', 220)
      p2.set('status', 'pendente')
      p2.set('lancado_por_nome', 'Administrador Operacional')
      p2.set('observacoes', 'Mecânica Rápida Motores - aguarda aprovação do proprietário')
      app.save(p2)

      const p3 = new Record(pagamentosCol)
      p3.set('moto', moto2.id)
      p3.set('descricao', 'Mensalidade rastreador GPS')
      p3.set('categoria', 'rastreador')
      p3.set('data_vencimento', nextWeek)
      p3.set('valor', 49.9)
      p3.set('status', 'pendente')
      p3.set('lancado_por_nome', 'Administrador Operacional')
      app.save(p3)
    }

    // 7. Seed Caixa inicial
    try {
      app.findFirstRecordByData('caixa_lancamentos', 'descricao', 'Aluguel semanal - Carlos Silva')
    } catch (_) {
      const c1 = new Record(caixaCol)
      c1.set('moto', moto1.id)
      c1.set('tipo', 'entrada')
      c1.set('descricao', 'Aluguel semanal - Carlos Silva')
      c1.set('categoria', 'aluguel')
      c1.set('valor', 245)
      c1.set('data', lastWeek)
      c1.set('forma_pagamento', 'pix')
      app.save(c1)

      const c2 = new Record(caixaCol)
      c2.set('moto', moto1.id)
      c2.set('tipo', 'saida')
      c2.set('descricao', 'Troca de óleo e filtro')
      c2.set('categoria', 'manutencao')
      c2.set('valor', 65)
      c2.set('data', lastWeek)
      c2.set('forma_pagamento', 'pix')
      app.save(c2)
    }
  },
  (app) => {
    // rollback logic if needed
  },
)
