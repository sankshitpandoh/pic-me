import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import OptionsPanel from '../components/OptionsPanel'

describe('OptionsPanel', () => {
  it('renders format selector and quality slider', () => {
    render(<OptionsPanel value={{ targetFormat: 'original', quality: 0.92, resize: { fit: 'contain' } }} onChange={() => {}} />)
    expect(screen.getByLabelText('Format')).toBeInTheDocument()
    expect(screen.getByLabelText(/Quality/)).toBeInTheDocument()
  })
})


