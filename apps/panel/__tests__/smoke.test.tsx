import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('Smoke test', () => {
  it('renders a basic React element', () => {
    render(<div data-testid="smoke">Hello Atena</div>)
    expect(screen.getByTestId('smoke')).toHaveTextContent('Hello Atena')
  })
})
