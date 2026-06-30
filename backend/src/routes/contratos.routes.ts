import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { ContratosController } from '../controllers/contratos.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { authorize, notProprietario } from '../middlewares/rbac.middleware'
import { pdfLimiter } from '../middlewares/rateLimit.middleware'

const router = Router()
const controller = new ContratosController()

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads', 'documentos'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf'
    cb(null, `contrato-assinado-${req.params.id}-${Date.now()}${ext}`)
  },
})
const upload = multer({ storage, limits: { fileSize: 30 * 1024 * 1024 } })

router.use(authenticate)
router.use(notProprietario)

router.get('/', controller.listar)
router.get('/:id', controller.buscar)
router.post('/gerar/:vendaId', authorize('admin', 'financeiro', 'gerencia'), pdfLimiter, controller.gerar)
router.get('/:id/pdf', pdfLimiter, controller.baixarPDF)
router.post('/:id/upload-assinado', authorize('admin', 'gerencia', 'financeiro'), upload.single('arquivo'), controller.uploadAssinado)
router.delete('/:id', authorize('admin'), controller.deletar)

export default router
