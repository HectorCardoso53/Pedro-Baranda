import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { DashboardService } from '../services/dashboard.service'
import { successResponse } from '../utils/response'

const service = new DashboardService()

export class DashboardController {
  async geral(_req: AuthRequest, res: Response) {
    const data = await service.geral()
    return successResponse(res, data)
  }

  async vendasMes(_req: AuthRequest, res: Response) {
    const data = await service.vendasMes()
    return successResponse(res, data)
  }

  async receitaMes(_req: AuthRequest, res: Response) {
    const data = await service.receitaMes()
    return successResponse(res, data)
  }

  async lotesStatus(_req: AuthRequest, res: Response) {
    const data = await service.lotesStatus()
    return successResponse(res, data)
  }

  async inadimplencia(_req: AuthRequest, res: Response) {
    const data = await service.inadimplencia()
    return successResponse(res, data)
  }
}
