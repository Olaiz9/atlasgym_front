import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PaginaError from './error'
import PaginaNoEncontrada from './not-found'

describe('Páginas de error y no encontrado', () => {
  it('renderiza not-found con el título en español y el link para volver al inicio', () => {
    render(<PaginaNoEncontrada />)
    expect(screen.getByRole('heading', { name: 'No encontramos esta página' })).toBeInTheDocument()
    expect(screen.getByText('Puede que el link esté mal o que la página ya no exista.')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Volver al inicio' })
    expect(link).toHaveAttribute('href', '/')
  })

  it('renderiza error.tsx sin exponer el mensaje técnico y ejecuta retry al hacer clic en Reintentar', () => {
    const retry = vi.fn()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const errorFalso = new Error('Detalle interno sensible de base de datos')

    render(<PaginaError error={errorFalso} retry={retry} />)

    expect(screen.getByRole('heading', { name: 'Algo salió mal' })).toBeInTheDocument()
    expect(
      screen.getByText('Probá de nuevo. Si sigue pasando, avisale a los titulares del gimnasio.')
    ).toBeInTheDocument()
    expect(screen.queryByText(/Detalle interno sensible/)).not.toBeInTheDocument()
    expect(consoleSpy).toHaveBeenCalledWith(errorFalso)

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(retry).toHaveBeenCalledTimes(1)

    const link = screen.getByRole('link', { name: 'Volver al inicio' })
    expect(link).toHaveAttribute('href', '/')

    consoleSpy.mockRestore()
  })
})
