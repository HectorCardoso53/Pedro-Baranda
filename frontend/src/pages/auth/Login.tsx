import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await login(data.email, data.password)
      toast.success('Bem-vindo ao Pedro Baranda!')
      navigate('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-8 border border-blue-100 shadow-xl">
      <div className="flex justify-center mb-3">
        <img
          src="/predo_baranda.png"
          alt="Pedro Baranda"
          className="w-full max-w-[160px] h-auto object-contain"
        />
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">Acesso ao Sistema</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-gray-700">E-mail</Label>
          <Input
            type="email"
            placeholder="seu@email.com"
            className="border-blue-200 focus-visible:ring-blue-500"
            {...register('email')}
          />
          {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-700">Senha</Label>
          <div className="relative">
            <Input
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              className="border-blue-200 focus-visible:ring-blue-500 pr-10"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 mt-2" disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</> : 'Entrar'}
        </Button>
      </form>

      <p className="text-center text-gray-400 text-xs mt-6">
        Pedro Baranda © {new Date().getFullYear()}
      </p>
    </div>
  )
}
