import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button.js'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-6xl font-bold text-gray-200">404</h1>
      <p className="mt-4 text-lg text-gray-600">Pagina nao encontrada</p>
      <Link to="/" className="mt-6">
        <Button>Voltar ao Dashboard</Button>
      </Link>
    </div>
  )
}
