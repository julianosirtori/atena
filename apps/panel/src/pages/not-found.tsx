import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
        <MapPin size={28} className="text-amber-600" />
      </div>
      <h1 className="font-heading text-2xl font-bold text-warm-900">Página não encontrada</h1>
      <p className="mt-2 text-sm text-warm-500">
        A página que você está procurando não existe ou foi movida.
      </p>
      <Link to="/inbox" className="mt-6">
        <Button>Voltar para o Inbox</Button>
      </Link>
    </div>
  )
}
