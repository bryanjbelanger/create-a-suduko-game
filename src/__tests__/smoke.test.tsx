import { render } from '@testing-library/react'
import Home from '@/app/page'

describe('test toolchain', () => {
  it('renders the home page through the @/ alias', () => {
    const { container } = render(<Home />)
    expect(container).toBeInTheDocument()
  })
})
