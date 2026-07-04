import prisma from '../lib/prisma'
import { addMonths, format, parseISO } from 'date-fns'
import { gerarPDF, mergePDFs, extensoReais, formatarMoedaBR, formatarDataBR } from '../utils/pdf'
import { gerarPixCopiaECola, gerarQRCodeSVG } from '../utils/pix'
import logger from '../utils/logger'
import path from 'path'
import fs from 'fs'

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'documentos')

export class VendasService {
  async listar(filtros: Record<string, unknown> = {}) {
    const where: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(filtros)) {
      if (v !== undefined && v !== null && v !== '') where[k] = v
    }
    return prisma.venda.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      include: {
        cliente: { select: { id: true, nome: true, cpfCnpj: true } },
        lote: { select: { id: true, numero: true } },
        projeto: { select: { id: true, nome: true } },
      },
    })
  }

  async buscar(id: string) {
    const venda = await prisma.venda.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nome: true, cpfCnpj: true, rg: true, telefone: true, celular: true, email: true, estadoCivil: true, profissao: true } },
        lote: { select: { id: true, numero: true, area: true, dimensao: true, localizacao: true, quadra: { select: { nome: true, localizacao: true } } } },
        projeto: { select: { id: true, nome: true, regiao: { select: { cidade: true, estado: true } } } },
      },
    })
    if (!venda) throw Object.assign(new Error('Venda não encontrada'), { statusCode: 404 })
    return venda
  }

  async buscarParcelas(vendaId: string) {
    return prisma.parcela.findMany({ where: { vendaId }, orderBy: { numero: 'asc' } })
  }

  async atualizar(id: string, data: { observacoes?: string; dataVenda?: string; diaVencimento?: number }) {
    await prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {}
      if (data.observacoes !== undefined) updateData.observacoes = data.observacoes || null
      if (data.dataVenda) updateData.dataVenda = new Date(`${data.dataVenda}T12:00:00.000Z`)
      if (data.diaVencimento) updateData.diaVencimento = data.diaVencimento

      await tx.venda.update({ where: { id }, data: updateData })

      if (data.diaVencimento) {
        const parcelasPendentes = await tx.parcela.findMany({
          where: { vendaId: id, status: { in: ['pendente', 'vencida'] } },
        })
        for (const p of parcelasPendentes) {
          const [year, month] = p.vencimento.split('-')
          const dia = String(data.diaVencimento).padStart(2, '0')
          await tx.parcela.update({ where: { id: p.id }, data: { vencimento: `${year}-${month}-${dia}` } })
        }
      }
    })

    return this.buscar(id)
  }

  private calcularPrimeiroVencimento(diaVencimento: number): string {
    const hoje = new Date()
    const diaHoje = hoje.getDate()
    let mes = hoje.getMonth()
    let ano = hoje.getFullYear()
    // Se o dia de vencimento já passou hoje, avança para o próximo mês
    if (diaVencimento <= diaHoje) {
      mes += 1
      if (mes > 11) { mes = 0; ano += 1 }
    }
    return format(new Date(ano, mes, diaVencimento), 'yyyy-MM-dd')
  }

  async criar(data: {
    loteId: string
    clienteId: string
    vendedorId: string
    valor: number
    entrada: number
    numeroParcelas: number
    diaVencimento: number
    formaEntrada?: string
    observacoes?: string
  }) {
    const lote = await prisma.lote.findUnique({ where: { id: data.loteId } })
    if (!lote) throw Object.assign(new Error('Lote não encontrado'), { statusCode: 404 })
    if (lote.status !== 'disponivel' && lote.status !== 'reservado') {
      throw Object.assign(new Error(`Lote não disponível para venda (status: ${lote.status})`), { statusCode: 409 })
    }

    const saldo = data.valor - data.entrada
    const valorParcela = parseFloat((saldo / data.numeroParcelas).toFixed(2))
    const primeiroVencimento = this.calcularPrimeiroVencimento(data.diaVencimento)

    const venda = await prisma.$transaction(async (tx) => {
      const novaVenda = await tx.venda.create({
        data: {
          loteId: data.loteId,
          clienteId: data.clienteId,
          proprietarioId: lote.proprietarioId,
          projetoId: lote.projetoId,
          quadraId: lote.quadraId,
          vendedorId: data.vendedorId,
          valor: data.valor,
          entrada: data.entrada,
          saldo,
          numeroParcelas: data.numeroParcelas,
          valorParcela,
          diaVencimento: data.diaVencimento,
          primeiroVencimento,
          formaEntrada: data.formaEntrada || null,
          dataVenda: new Date(),
          status: 'ativa',
          observacoes: data.observacoes || null,
        },
      })

      // Gerar parcelas
      const parcelas = []
      for (let i = 1; i <= data.numeroParcelas; i++) {
        const vencimento = addMonths(parseISO(primeiroVencimento), i - 1)
        const parcela = await tx.parcela.create({
          data: {
            vendaId: novaVenda.id,
            loteId: data.loteId,
            clienteId: data.clienteId,
            proprietarioId: lote.proprietarioId,
            projetoId: lote.projetoId,
            numero: i,
            valor: valorParcela,
            vencimento: format(vencimento, 'yyyy-MM-dd'),
            status: 'pendente',
            juros: 0,
            multa: 0,
            desconto: 0,
          },
        })
        parcelas.push(parcela)
      }

      // Atualizar status do lote
      await tx.lote.update({
        where: { id: data.loteId },
        data: { status: 'vendido', vendaId: novaVenda.id },
      })

      // Registrar entrada como movimentação
      if (data.entrada > 0) {
        await tx.movimentacaoFinanceira.create({
          data: {
            tipo: 'entrada',
            categoria: 'entrada_venda',
            descricao: `Entrada - Venda ${novaVenda.id.substring(0, 8)}`,
            valor: data.entrada,
            data: new Date().toISOString().split('T')[0],
            vendaId: novaVenda.id,
            proprietarioId: lote.proprietarioId,
            projetoId: lote.projetoId,
            registradoPor: data.vendedorId,
          },
        })
      }

      return { ...novaVenda, parcelas }
    })

    logger.info(`Venda criada: ${venda.id} - Lote: ${data.loteId}`)
    return venda
  }

  async cancelar(id: string, motivo: string) {
    const venda = await prisma.venda.findUnique({ where: { id } })
    if (!venda) throw Object.assign(new Error('Venda não encontrada'), { statusCode: 404 })
    if (venda.status !== 'ativa') {
      throw Object.assign(new Error('Somente vendas ativas podem ser canceladas'), { statusCode: 409 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.venda.update({
        where: { id },
        data: { status: 'cancelada', motivoCancelamento: motivo, canceladoEm: new Date() },
      })
      await tx.parcela.updateMany({
        where: { vendaId: id, status: { in: ['pendente', 'vencida'] } },
        data: { status: 'cancelada' },
      })
      await tx.lote.update({
        where: { id: venda.loteId },
        data: { status: 'disponivel', vendaId: null },
      })
    })

    return { id, status: 'cancelada' }
  }

  async distratar(id: string, motivo: string) {
    const venda = await prisma.venda.findUnique({ where: { id } })
    if (!venda) throw Object.assign(new Error('Venda não encontrada'), { statusCode: 404 })
    if (venda.status !== 'ativa') {
      throw Object.assign(new Error('Somente vendas ativas podem ser distratadas'), { statusCode: 409 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.venda.update({
        where: { id },
        data: { status: 'distratada', motivoDistrato: motivo, distratatoEm: new Date() },
      })
      await tx.parcela.updateMany({
        where: { vendaId: id, status: { in: ['pendente', 'vencida'] } },
        data: { status: 'cancelada' },
      })
      await tx.lote.update({
        where: { id: venda.loteId },
        data: { status: 'disponivel', vendaId: null },
      })
    })

    return { id, status: 'distratada' }
  }

  async deletar(id: string) {
    const venda = await prisma.venda.findUnique({ where: { id } })
    if (!venda) throw Object.assign(new Error('Venda não encontrada'), { statusCode: 404 })

    // Busca IDs das parcelas para deletar dependentes corretamente
    const parcelas = await prisma.parcela.findMany({ where: { vendaId: id }, select: { id: true } })
    const parcelaIds = parcelas.map((p) => p.id)

    await prisma.$transaction(async (tx) => {
      if (parcelaIds.length > 0) {
        await tx.pagamento.deleteMany({ where: { parcelaId: { in: parcelaIds } } })
        await tx.promissoria.deleteMany({ where: { parcelaId: { in: parcelaIds } } })
      }
      await tx.contrato.deleteMany({ where: { vendaId: id } })
      await tx.movimentacaoFinanceira.deleteMany({ where: { vendaId: id } })
      await tx.parcela.deleteMany({ where: { vendaId: id } })
      await tx.venda.delete({ where: { id } })
      if (venda.loteId) {
        await tx.lote.update({
          where: { id: venda.loteId },
          data: { status: 'disponivel', vendaId: null },
        })
      }
    })
  }

  async gerarReciboVenda(vendaId: string) {
    const venda = await prisma.venda.findUnique({ where: { id: vendaId } })
    if (!venda) throw Object.assign(new Error('Venda não encontrada'), { statusCode: 404 })

    const [lote, cliente] = await Promise.all([
      prisma.lote.findUnique({ where: { id: venda.loteId } }),
      prisma.cliente.findUnique({ where: { id: venda.clienteId } }),
    ])

    let quadraNome = '', projetoNome = ''
    if (lote?.quadraId) {
      const quadra = await prisma.quadra.findUnique({ where: { id: lote.quadraId } })
      if (quadra) quadraNome = quadra.nome
    }
    if (lote?.projetoId) {
      const projeto = await prisma.projeto.findUnique({ where: { id: lote.projetoId } })
      if (projeto) projetoNome = projeto.nome
    }

    const logoPath = path.join(__dirname, '..', '..', 'assets', 'logo.png')
    let logoBase64: string | null = null
    try {
      const logoData = fs.readFileSync(logoPath)
      logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`
    } catch { /* sem logo */ }

    const dataVenda = venda.dataVenda
      ? new Date(venda.dataVenda).toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR')

    const formaEntradaLabel: Record<string, string> = {
      pix: 'PIX', dinheiro: 'Dinheiro', transferencia: 'Transferência', debito: 'Débito', cheque: 'Cheque',
    }

    const url = await gerarPDF('recibo-venda', {
      venda: { ...venda, id: vendaId, formaEntrada: venda.formaEntrada ? (formaEntradaLabel[venda.formaEntrada] || venda.formaEntrada) : null },
      lote: { ...lote, quadraNome, projetoNome },
      cliente,
      dataVenda,
      dataGeracao: new Date().toLocaleDateString('pt-BR'),
      logoBase64,
    }, `recibo-venda-${vendaId}.pdf`, { margin: { top: '10mm', right: '15mm', bottom: '10mm', left: '15mm' } })

    return { url }
  }

  async gerarContrato(vendaId: string) {
    const venda = await prisma.venda.findUnique({ where: { id: vendaId } })
    if (!venda) throw Object.assign(new Error('Venda não encontrada'), { statusCode: 404 })

    const [lote, cliente, parcelas] = await Promise.all([
      prisma.lote.findUnique({ where: { id: venda.loteId } }),
      prisma.cliente.findUnique({ where: { id: venda.clienteId } }),
      prisma.parcela.findMany({ where: { vendaId }, orderBy: { numero: 'asc' } }),
    ])

    let quadraNome = '', projetoNome = ''
    if (lote?.quadraId) {
      const quadra = await prisma.quadra.findUnique({ where: { id: lote.quadraId } })
      if (quadra) quadraNome = quadra.nome
    }
    if (lote?.projetoId) {
      const projeto = await prisma.projeto.findUnique({ where: { id: lote.projetoId } })
      if (projeto) projetoNome = projeto.nome
    }

    const ordinals = [
      'Primeira', 'Segunda', 'Terceira', 'Quarta', 'Quinta', 'Sexta', 'Sétima', 'Oitava',
      'Nona', 'Décima', 'Décima primeira', 'Décima segunda', 'Décima terceira', 'Décima quarta',
      'Décima quinta', 'Décima sexta', 'Décima sétima', 'Décima oitava', 'Décima nona', 'Vigésima',
      'Vigésima primeira', 'Vigésima segunda', 'Vigésima terceira', 'Vigésima quarta',
      'Trigésima', 'Trigésima primeira', 'Trigésima segunda', 'Trigésima terceira',
      'Quadragésima', 'Quinquagésima', 'Sexagésima',
    ]
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

    const parcelasTemplate = parcelas.map((p, i) => ({
      ordinal: ordinals[i] || `${i + 1}ª`,
      valorFormatado: formatarMoedaBR(p.valor),
      valorExtenso: extensoReais(p.valor),
      vencimentoFormatado: formatarDataBR(p.vencimento),
    }))

    const end = cliente?.endereco as any
    const clienteEndereco = end?.logradouro
      ? `${end.logradouro}${end.numero ? ', nº ' + end.numero : ''}${end.bairro ? ', ' + end.bairro : ''}${end.cidade ? ', ' + end.cidade + (end.estado ? '/' + end.estado : '') : ''}`
      : ''

    let primeiroPagamentoMesAno = ''
    if (venda.primeiroVencimento) {
      const p = venda.primeiroVencimento.split('T')[0].split('-')
      primeiroPagamentoMesAno = `${meses[parseInt(p[1]) - 1]} de ${p[0]}`
    }

    const url = await gerarPDF('contrato', {
      venda: { ...venda, id: vendaId },
      lote: { ...lote, quadraNome, projetoNome },
      cliente,
      clienteEndereco,
      primeiroPagamentoMesAno,
      parcelas: parcelasTemplate,
      dataGeracao: new Date().toLocaleDateString('pt-BR'),
    }, `contrato-${vendaId}.pdf`)

    await prisma.venda.update({ where: { id: vendaId }, data: { contratoUrl: url } })
    await prisma.contrato.create({
      data: { vendaId, tipo: 'contrato', url, clienteId: venda.clienteId },
    })

    return { url }
  }

  async gerarPromissorias(vendaId: string) {
    const venda = await prisma.venda.findUnique({ where: { id: vendaId } })
    if (!venda) throw Object.assign(new Error('Venda não encontrada'), { statusCode: 404 })

    const [lote, cliente, parcelas] = await Promise.all([
      prisma.lote.findUnique({ where: { id: venda.loteId } }),
      prisma.cliente.findUnique({ where: { id: venda.clienteId } }),
      prisma.parcela.findMany({ where: { vendaId }, orderBy: { numero: 'asc' } }),
    ])

    const proprietarioId = parcelas[0]?.proprietarioId
    const [projResult, quadraResult, propResult] = await Promise.all([
      lote?.projetoId ? prisma.projeto.findUnique({ where: { id: lote.projetoId } }) : null,
      lote?.quadraId ? prisma.quadra.findUnique({ where: { id: lote.quadraId } }) : null,
      proprietarioId ? prisma.proprietario.findUnique({ where: { id: proprietarioId } }) : null,
    ])

    const projetoNome = projResult?.nome ?? ''
    const quadraNome = quadraResult?.nome ?? ''
    const pixChave = propResult?.pixChave ?? null
    const pixNome = propResult?.nome ?? null

    const parcelasBase = parcelas.map((p) => {
      let pixCopiaECola: string | null = null
      if (pixChave && pixNome) {
        try {
          pixCopiaECola = gerarPixCopiaECola({
            chave: pixChave,
            nome: pixNome,
            cidade: process.env.PIX_CIDADE || 'Cidade',
            valor: p.valor,
            txid: p.id.substring(0, 25),
            descricao: `Parcela ${p.numero}`,
          })
        } catch { /* sem pix */ }
      }
      return { ...p, vencimentoFormatado: format(new Date(p.vencimento + 'T00:00:00'), 'dd/MM/yyyy'), pixCopiaECola }
    })

    const parcelasComDados = await Promise.all(
      parcelasBase.map(async (p) => {
        let pixQrCode: string | null = null
        if (p.pixCopiaECola) {
          try { pixQrCode = await gerarQRCodeSVG(p.pixCopiaECola) } catch { /* sem qr */ }
        }
        return { ...p, pixQrCode }
      })
    )

    const BATCH = 12
    const pdfMargin = { margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' } }
    const baseData = {
      totalParcelas: parcelas.length,
      cliente,
      lote: { ...lote, projetoNome, quadraNome },
      vendaRef: vendaId.substring(0, 8).toUpperCase(),
      dataGeracao: new Date().toLocaleDateString('pt-BR'),
    }
    const finalFile = `promissorias-${vendaId}.pdf`

    if (parcelasComDados.length <= BATCH) {
      const pdfUrl = await gerarPDF('promissorias', { ...baseData, parcelas: parcelasComDados }, finalFile, pdfMargin)
      return { url: pdfUrl }
    }

    // Gera em lotes e mergeia
    const tempPaths: string[] = []
    for (let i = 0; i < parcelasComDados.length; i += BATCH) {
      const batch = parcelasComDados.slice(i, i + BATCH)
      const tmpFile = `promissorias-${vendaId}-p${i}.pdf`
      await gerarPDF('promissorias', { ...baseData, parcelas: batch }, tmpFile, pdfMargin)
      tempPaths.push(path.join(UPLOADS_DIR, tmpFile))
    }

    const finalPath = path.join(UPLOADS_DIR, finalFile)
    await mergePDFs(tempPaths, finalPath)
    tempPaths.forEach(p => { try { fs.unlinkSync(p) } catch {} })

    logger.info(`Promissórias geradas em ${tempPaths.length} lotes: ${finalFile}`)
    return { url: `/uploads/documentos/${finalFile}` }
  }

  async gerarPromissoriaDigital(vendaId: string, parcelaId: string) {
    const [venda, parcela] = await Promise.all([
      prisma.venda.findUnique({ where: { id: vendaId } }),
      prisma.parcela.findUnique({ where: { id: parcelaId } }),
    ])
    if (!venda) throw Object.assign(new Error('Venda não encontrada'), { statusCode: 404 })
    if (!parcela || parcela.vendaId !== vendaId) throw Object.assign(new Error('Parcela não encontrada'), { statusCode: 404 })

    const [lote, cliente] = await Promise.all([
      prisma.lote.findUnique({ where: { id: venda.loteId } }),
      prisma.cliente.findUnique({ where: { id: venda.clienteId } }),
    ])

    const [projResult, quadraResult, propResult] = await Promise.all([
      lote?.projetoId ? prisma.projeto.findUnique({ where: { id: lote.projetoId } }) : null,
      lote?.quadraId ? prisma.quadra.findUnique({ where: { id: lote.quadraId } }) : null,
      parcela.proprietarioId ? prisma.proprietario.findUnique({ where: { id: parcela.proprietarioId } }) : null,
    ])

    const pixChave = propResult?.pixChave ?? null
    const pixNome = propResult?.nome ?? null
    let pixCopiaECola: string | null = null
    let pixQrCode: string | null = null

    if (pixChave && pixNome) {
      try {
        pixCopiaECola = gerarPixCopiaECola({
          chave: pixChave,
          nome: pixNome,
          cidade: process.env.PIX_CIDADE || 'Cidade',
          valor: parcela.valor,
          txid: parcela.id.substring(0, 25),
          descricao: `Parcela ${parcela.numero}`,
        })
        pixQrCode = await gerarQRCodeSVG(pixCopiaECola)
      } catch { /* sem pix */ }
    }

    const logoPath = path.join(__dirname, '..', '..', 'assets', 'logo.png')
    let logoBase64: string | null = null
    try {
      const logoData = fs.readFileSync(logoPath)
      logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`
    } catch { /* sem logo */ }

    const fileName = `promissoria-digital-${vendaId}-${parcelaId}.pdf`
    const pdfUrl = await gerarPDF('promissoria-digital', {
      parcela: { ...parcela },
      venda: { numeroParcelas: venda.numeroParcelas },
      cliente,
      lote: { ...lote, projetoNome: projResult?.nome ?? '', quadraNome: quadraResult?.nome ?? '' },
      vencimentoFormatado: format(parseISO(parcela.vencimento + 'T00:00:00'), 'dd/MM/yyyy'),
      dataGeracao: new Date().toLocaleDateString('pt-BR'),
      pixCopiaECola,
      pixQrCode,
      logoBase64,
    }, fileName, { margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' } })

    return { url: pdfUrl }
  }

  async gerarCarne(vendaId: string) {
    const venda = await prisma.venda.findUnique({ where: { id: vendaId } })
    if (!venda) throw Object.assign(new Error('Venda não encontrada'), { statusCode: 404 })

    const [lote, cliente, parcelas] = await Promise.all([
      prisma.lote.findUnique({ where: { id: venda.loteId } }),
      prisma.cliente.findUnique({ where: { id: venda.clienteId } }),
      prisma.parcela.findMany({ where: { vendaId }, orderBy: { numero: 'asc' } }),
    ])

    const proprietarioIdCarne = parcelas[0]?.proprietarioId
    const [projCarne, propCarne] = await Promise.all([
      lote?.projetoId ? prisma.projeto.findUnique({ where: { id: lote.projetoId } }) : null,
      proprietarioIdCarne ? prisma.proprietario.findUnique({ where: { id: proprietarioIdCarne } }) : null,
    ])

    const projetoNome = projCarne?.nome ?? ''
    const pixChave = propCarne?.pixChave ?? null
    const pixNome = propCarne?.nome ?? null

    const parcelasBase = parcelas.map((p) => {
      let pixCopiaECola: string | null = null
      if (pixChave && pixNome) {
        try {
          pixCopiaECola = gerarPixCopiaECola({
            chave: pixChave,
            nome: pixNome,
            cidade: process.env.PIX_CIDADE || 'Cidade',
            valor: p.valor,
            txid: p.id.substring(0, 25),
            descricao: `Parcela ${p.numero}`,
          })
        } catch { /* sem pix */ }
      }
      return { ...p, vencimentoFormatado: format(new Date(p.vencimento + 'T00:00:00'), 'dd/MM/yyyy'), pixCopiaECola }
    })

    const parcelasComDados = await Promise.all(
      parcelasBase.map(async (p) => {
        let pixQrCode: string | null = null
        if (p.pixCopiaECola) {
          try { pixQrCode = await gerarQRCodeSVG(p.pixCopiaECola) } catch { /* sem qr */ }
        }
        return { ...p, pixQrCode }
      })
    )

    const BATCH_C = 12
    const pdfMarginC = { margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' } }
    const baseDataC = {
      totalParcelas: parcelas.length,
      cliente,
      lote: { ...lote, projetoNome },
      vendaRef: vendaId.substring(0, 8).toUpperCase(),
      dataGeracao: new Date().toLocaleDateString('pt-BR'),
    }
    const finalFileC = `carne-${vendaId}.pdf`

    if (parcelasComDados.length <= BATCH_C) {
      const pdfUrl = await gerarPDF('carne', { ...baseDataC, parcelas: parcelasComDados }, finalFileC, pdfMarginC)
      return { url: pdfUrl }
    }

    const tempPathsC: string[] = []
    for (let i = 0; i < parcelasComDados.length; i += BATCH_C) {
      const batchC = parcelasComDados.slice(i, i + BATCH_C)
      const tmpFile = `carne-${vendaId}-p${i}.pdf`
      await gerarPDF('carne', { ...baseDataC, parcelas: batchC }, tmpFile, pdfMarginC)
      tempPathsC.push(path.join(UPLOADS_DIR, tmpFile))
    }

    const finalPathC = path.join(UPLOADS_DIR, finalFileC)
    await mergePDFs(tempPathsC, finalPathC)
    tempPathsC.forEach(p => { try { fs.unlinkSync(p) } catch {} })

    logger.info(`Carnê gerado em ${tempPathsC.length} lotes: ${finalFileC}`)
    return { url: `/uploads/documentos/${finalFileC}` }
  }
}
