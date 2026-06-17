import { Router } from 'express'
import { InadimplenciaController } from '../controllers/inadimplencia.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { notProprietario } from '../middlewares/rbac.middleware'

const router = Router()
const controller = new InadimplenciaController()

router.use(authenticate)
router.use(notProprietario)

router.get('/', controller.listar)
router.get('/resumo', controller.resumo)
router.get('/por-projeto', controller.porProjeto)
router.post('/processar', controller.processarInadimplencia)

export default router
