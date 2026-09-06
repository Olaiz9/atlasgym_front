import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Componente Button (<Button />)', () => {
  it('debe renderizar el texto del botón correctamente', () => {
    render(<Button>Guardar Alumno</Button>);
    expect(screen.getByRole('button', { name: /guardar alumno/i })).toBeInTheDocument();
  });

  it('debe disparar el evento onClick al hacer clic', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Hacer Clic</Button>);
    
    const boton = screen.getByRole('button', { name: /hacer clic/i });
    await user.click(boton);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('no debe disparar el evento onClick cuando está deshabilitado', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button disabled onClick={handleClick}>Deshabilitado</Button>);
    
    const boton = screen.getByRole('button', { name: /deshabilitado/i });
    await user.click(boton);

    expect(handleClick).not.toHaveBeenCalled();
  });
});
