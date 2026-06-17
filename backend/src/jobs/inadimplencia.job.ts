import cron from 'node-cron'
import { InadimplenciaService } from '../services/inadimplencia.service'
import logger from '../utils/logger'

const service = new InadimplenciaService()

export function startInadimplenciaJob() {
  // Executa todo dia às 01:00
  cron.schedule('0 1 * * *', async () => {
    logger.info('Job inadimplência iniciado')
    try {
      const result = await service.processar()
      logger.info(`Job inadimplência concluído: ${result.processadas} parcelas processadas`)
    } catch (error) {
      logger.error('Erro no job de inadimplência:', error)
    }
  }, { timezone: 'America/Sao_Paulo' })

  logger.info('Job de inadimplência agendado (diário 01:00 BRT)')
}
