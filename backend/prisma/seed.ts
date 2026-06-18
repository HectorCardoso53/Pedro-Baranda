import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const existe = await prisma.usuario.findUnique({ where: { email: 'admin@pedrobaranda.com' } })
  if (existe) {
    console.log('Seed já executado.')
    return
  }

  const senha = await bcrypt.hash('admin123', 10)
  await prisma.usuario.create({
    data: {
      nome: 'Administrador',
      email: 'admin@pedrobaranda.com',
      senha,
      role: 'admin',
      ativo: true,
    },
  })

  console.log('Usuário admin criado: admin@pedrobaranda.com / admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
