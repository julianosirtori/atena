import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle size={24} className="text-red-500" />
          </div>
          <h3 className="font-heading text-base font-semibold text-warm-800">
            Algo deu errado
          </h3>
          <p className="mt-1 text-sm text-warm-500">
            Ocorreu um erro inesperado. Tente novamente.
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => this.setState({ hasError: false })}
          >
            Tentar novamente
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
