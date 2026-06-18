import prisma from '../lib/prisma'
import { addMonths, format, parseISO } from 'date-fns'
import { gerarPDF } from '../utils/pdf'
import logger from '../utils/logger'

export class VendasService {
  async listar(filtros: Record<string, unknown> = {}) {
    const where: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(filtros)) {
      if (v !== undefined && v !== null && v !== '') where[k] = v
    }
    return prisma.venda.findMany({ where, orderBy: { criadoEm: 'desc' } })
  }

  async buscar(id: string) {
    const venda = await prisma.venda.findUnique({ where: { id } })
    if (!venda) throw Object.assign(new Error('Venda não encontrada'), { statusCode: 404 })
    return venda
  }

  async buscarParcelas(vendaId: string) {
    return prisma.parcela.findMany({ where: { vendaId }, orderBy: { numero: 'asc' } })
  }

  async criar(data: {
    loteId: string
    clienteId: string
    vendedorId: string
    valor: number
    entrada: number
    numeroParcelas: number
    diaVencimento: number
    primeiroVencimento: string
    observacoes?: string
  }) {
    const lote = await prisma.lote.findUnique({ where: { id: data.loteId } })
    if (!lote) throw Object.assign(new Error('Lote não encontrado'), { statusCode: 404 })
    if (lote.status !== 'disponivel' && lote.status !== 'reservado') {
      throw Object.assign(new Error(`Lote não disponível para venda (status: ${lote.status})`), { statusCode: 409 })
    }

    const saldo = data.valor - data.entrada
    const valorParcela = parseFloat((saldo / data.numeroParcelas).toFixed(2))

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
          primeiroVencimento: data.primeiroVencimento,
          dataVenda: new Date(),
          status: 'ativa',
          observacoes: data.observacoes || null,
        },
      })

      // Gerar parcelas
      const parcelas = []
      for (let i = 1; i <= data.numeroParcelas; i++) {
        const vencimento = addMonths(parseISO(data.primeiroVencimento), i - 1)
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

    await prisma.$transaction(async (tx) => {
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

  async gerarContrato(vendaId: string) {
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

    const url = await gerarPDF('contrato', {
      venda: { ...venda, id: vendaId },
      lote: { ...lote, quadraNome, projetoNome },
      cliente,
      dataGeracao: new Date().toLocaleDateString('pt-BR'),
    }, `contrato-${vendaId}.pdf`)

    await prisma.venda.update({ where: { id: vendaId }, data: { contratoUrl: url } })
    await prisma.contrato.create({
      data: { vendaId, tipo: 'contrato', url, clienteId: venda.clienteId },
    })

    return { url }
  }
}
