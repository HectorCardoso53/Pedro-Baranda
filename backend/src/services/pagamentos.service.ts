import prisma from '../lib/prisma'
import { differenceInDays, parseISO } from 'date-fns'
import { gerarPDF } from '../utils/pdf'
import logger from '../utils/logger'

const JUROS_MES = 0.01
const MULTA = 0.02

export class PagamentosService {
  async listar(filtros: Record<string, unknown> = {}) {
    const where: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(filtros)) {
      if (v !== undefined && v !== null && v !== '') where[k] = v
    }
    return prisma.pagamento.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      include: {
        parcela: { select: { numero: true, valor: true } },
        cliente: { select: { nome: true } },
      },
    })
  }

  async registrar(data: {
    parcelaId: string
    valor: number
    formaPagamento: string
    dataPagamento: string
    comprovante?: string
    observacoes?: string
    registradoPor: string
  }) {
    const parcela = await prisma.parcela.findUnique({ where: { id: data.parcelaId } })
    if (!parcela) throw Object.assign(new Error('Parcela não encontrada'), { statusCode: 404 })
    if (parcela.status === 'paga') throw Object.assign(new Error('Parcela já está paga'), { statusCode: 409 })
    if (parcela.status === 'cancelada') throw Object.assign(new Error('Parcela cancelada não pode ser paga'), { statusCode: 409 })

    const vencimento = parseISO(parcela.vencimento)
    const pagamento = parseISO(data.dataPagamento)
    const diasAtraso = Math.max(0, differenceInDays(pagamento, vencimento))
    const juros = diasAtraso > 0 ? parcela.valor * JUROS_MES * (diasAtraso / 30) : 0
    const multa = diasAtraso > 0 ? parcela.valor * MULTA : 0
    const valorTotal = parseFloat((parcela.valor + juros + multa).toFixed(2))

    const pagamentoData = await prisma.$transaction(async (tx) => {
      const novoPagamento = await tx.pagamento.create({
        data: {
          parcelaId: data.parcelaId,
          vendaId: parcela.vendaId,
          clienteId: parcela.clienteId,
          proprietarioId: parcela.proprietarioId,
          projetoId: parcela.projetoId,
          valor: valorTotal,
          valorPrincipal: parcela.valor,
          juros: parseFloat(juros.toFixed(2)),
          multa: parseFloat(multa.toFixed(2)),
          diasAtraso,
          dataPagamento: data.dataPagamento,
          formaPagamento: data.formaPagamento,
          comprovante: data.comprovante || null,
          observacoes: data.observacoes || null,
          registradoPor: data.registradoPor,
        },
      })

      await tx.parcela.update({
        where: { id: data.parcelaId },
        data: {
          status: 'paga',
          valorPago: valorTotal,
          pagamento: data.dataPagamento,
          juros: parseFloat(juros.toFixed(2)),
          multa: parseFloat(multa.toFixed(2)),
          pagamentoId: novoPagamento.id,
        },
      })

      // Atualizar promissórias ativas
      await tx.promissoria.updateMany({
        where: { parcelaId: data.parcelaId, status: 'ativa' },
        data: { status: 'quitada' },
      })

      // Movimentação financeira
      await tx.movimentacaoFinanceira.create({
        data: {
          tipo: 'entrada',
          categoria: 'pagamento_parcela',
          descricao: `Parcela ${parcela.numero} - Venda ${parcela.vendaId?.substring(0, 8)}`,
          valor: valorTotal,
          data: data.dataPagamento,
          vendaId: parcela.vendaId,
          parcelaId: data.parcelaId,
          pagamentoId: novoPagamento.id,
          proprietarioId: parcela.proprietarioId,
          projetoId: parcela.projetoId,
          registradoPor: data.registradoPor,
        },
      })

      return novoPagamento
    })

    // Verificar se todas as parcelas foram pagas
    await this.verificarQuitacao(parcela.vendaId)

    logger.info(`Pagamento registrado: parcela ${data.parcelaId}`)
    return pagamentoData
  }

  private async verificarQuitacao(vendaId: string) {
    const parcelas = await prisma.parcela.findMany({ where: { vendaId } })
    const todasPagas = parcelas.every((p) => p.status === 'paga' || p.status === 'cancelada')
    if (todasPagas && parcelas.length > 0) {
      await prisma.venda.update({
        where: { id: vendaId },
        data: { status: 'quitada', quitadoEm: new Date() },
      })
      logger.info(`Venda quitada: ${vendaId}`)
    }
  }

  async atualizarData(pagamentoId: string, dataPagamento: string) {
    const pagamento = await prisma.pagamento.findUnique({ where: { id: pagamentoId } })
    if (!pagamento) throw Object.assign(new Error('Pagamento não encontrado'), { statusCode: 404 })

    await prisma.$transaction(async (tx: any) => {
      await tx.pagamento.update({ where: { id: pagamentoId }, data: { dataPagamento } })
      await tx.parcela.update({ where: { id: pagamento.parcelaId }, data: { pagamento: dataPagamento } })
      await tx.movimentacaoFinanceira.updateMany({
        where: { pagamentoId },
        data: { data: dataPagamento },
      })
    })

    return { atualizado: true }
  }

  async estornar(pagamentoId: string) {
    const pagamento = await prisma.pagamento.findUnique({ where: { id: pagamentoId } })
    if (!pagamento) throw Object.assign(new Error('Pagamento não encontrado'), { statusCode: 404 })

    await prisma.$transaction(async (tx) => {
      await tx.pagamento.delete({ where: { id: pagamentoId } })

      await tx.parcela.update({
        where: { id: pagamento.parcelaId },
        data: {
          status: 'pendente',
          valorPago: null,
          pagamento: null,
          juros: 0,
          multa: 0,
          pagamentoId: null,
        },
      })

      await tx.promissoria.updateMany({
        where: { parcelaId: pagamento.parcelaId, status: 'quitada' },
        data: { status: 'ativa' },
      })

      if (pagamento.vendaId) {
        const venda = await tx.venda.findUnique({ where: { id: pagamento.vendaId } })
        if (venda?.status === 'quitada') {
          await tx.venda.update({
            where: { id: pagamento.vendaId },
            data: { status: 'ativa', quitadoEm: null },
          })
        }
      }
    })

    return { estornado: true }
  }

  async gerarRecibo(pagamentoId: string) {
    const pagamento = await prisma.pagamento.findUnique({ where: { id: pagamentoId } })
    if (!pagamento) throw Object.assign(new Error('Pagamento não encontrado'), { statusCode: 404 })

    const [parcela, cliente] = await Promise.all([
      prisma.parcela.findUnique({ where: { id: pagamento.parcelaId } }),
      pagamento.clienteId ? prisma.cliente.findUnique({ where: { id: pagamento.clienteId } }) : null,
    ])

    const url = await gerarPDF('recibo', {
      pagamento: { ...pagamento, id: pagamentoId },
      parcela,
      cliente,
      dataGeracao: new Date().toLocaleDateString('pt-BR'),
    }, `recibo-${pagamentoId}.pdf`)

    return { url }
  }
}
