/**
 * Frontend component tests — DonutChart, SummaryCards, ExcelSelector
 * Uses React Testing Library + @testing-library/jest-dom matchers
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

import DonutChart from '../components/DonutChart.jsx'
import SummaryCards from '../components/SummaryCards.jsx'
import ExcelSelector from '../components/ExcelSelector.jsx'

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const officeData = [
  { office: 'AV. ARGENTINA',  value: 300, avgLeadTime: 5, otorgados: 200, denegados: 100 },
  { office: 'PLACILLA',       value: 150, avgLeadTime: 3, otorgados: 120, denegados:  30 },
  { office: 'MERCADO PUERTO', value:  80, avgLeadTime: 7, otorgados:  60, denegados:  20 }
]

const mockStats = {
  total: 530,
  otorgados: 380,
  denegados: 150,
  pendientes: 0,
  moralAlerts: 24,
  moralEffectiveness: 75,
  avgLeadTime: 5
}

// ---------------------------------------------------------------------------
// 1. DonutChart
// ---------------------------------------------------------------------------

describe('DonutChart', () => {
  it('renders the loading/empty state when data is null', () => {
    render(<DonutChart data={null} />)
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
    expect(screen.getByText('Distribución por Oficina')).toBeInTheDocument()
  })

  it('renders the empty state when data is an empty array', () => {
    render(<DonutChart data={[]} />)
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
  })

  it('renders the full chart card when valid data is provided', () => {
    const { container } = render(<DonutChart data={officeData} />)
    expect(container.querySelector('.chart-card')).toBeInTheDocument()
  })

  it('renders one SVG circle segment per data entry', () => {
    const { container } = render(<DonutChart data={officeData} />)
    const segments = container.querySelectorAll('.donut-segment')
    expect(segments).toHaveLength(officeData.length)
  })

  it('sets data-target-offset on each segment', () => {
    const { container } = render(<DonutChart data={officeData} />)
    const segments = container.querySelectorAll('.donut-segment')
    segments.forEach(seg => {
      expect(seg).toHaveAttribute('data-target-offset')
    })
  })

  it('renders one legend item per data entry', () => {
    const { container } = render(<DonutChart data={officeData} />)
    const legendItems = container.querySelectorAll('.donut-legend-item')
    expect(legendItems).toHaveLength(officeData.length)
  })

  it('renders compact mode with a compact-donut-wrapper class', () => {
    const { container } = render(<DonutChart data={officeData} compact={true} />)
    expect(container.querySelector('.compact-donut-wrapper')).toBeInTheDocument()
  })

  it('handles single data entry without errors', () => {
    const singleData = [{ office: 'AV. ARGENTINA', value: 100, avgLeadTime: 5 }]
    const { container } = render(<DonutChart data={singleData} />)
    expect(container.querySelectorAll('.donut-segment')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// 2. SummaryCards
// ---------------------------------------------------------------------------

describe('SummaryCards', () => {
  it('renders skeleton loading cards when loading=true', () => {
    const { container } = render(<SummaryCards stats={null} loading={true} />)
    const skeletons = container.querySelectorAll('.bento-card-skeleton')
    expect(skeletons.length).toBeGreaterThanOrEqual(3)
  })

  it('renders nothing when loading=false and stats is null', () => {
    const { container } = render(<SummaryCards stats={null} loading={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the monitoring section when stats are provided', () => {
    render(<SummaryCards stats={mockStats} loading={false} />)
    expect(screen.getByRole('region', { name: /Monitoreo en Tiempo Real/i })).toBeInTheDocument()
  })

  it('has the correct ARIA label on the section', () => {
    render(<SummaryCards stats={mockStats} loading={false} />)
    expect(screen.getByLabelText('Panel Bento de Monitoreo en Tiempo Real')).toBeInTheDocument()
  })

  it('renders exactly 3 bento cards', () => {
    const { container } = render(<SummaryCards stats={mockStats} loading={false} />)
    const cards = container.querySelectorAll('.bento-card:not(.bento-card-skeleton)')
    expect(cards).toHaveLength(3)
  })

  it('renders the "Total Expedientes" card heading', () => {
    render(<SummaryCards stats={mockStats} loading={false} />)
    expect(screen.getByText('Total Expedientes')).toBeInTheDocument()
  })

  it('renders the "Tasa Aprobación" card heading', () => {
    render(<SummaryCards stats={mockStats} loading={false} />)
    expect(screen.getByText('Tasa Aprobación')).toBeInTheDocument()
  })

  it('renders the "Filtro Moral" card heading', () => {
    render(<SummaryCards stats={mockStats} loading={false} />)
    expect(screen.getByText('Filtro Moral')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 3. ExcelSelector
// ---------------------------------------------------------------------------

describe('ExcelSelector', () => {
  const defaultProps = {
    selectedMonth: 'all',
    setSelectedMonth: vi.fn(),
    selectedOffice: 'all',
    setSelectedOffice: vi.fn(),
    onDownloadPdf: vi.fn(),
    isDownloading: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the selector bar container', () => {
    const { container } = render(<ExcelSelector {...defaultProps} />)
    expect(container.querySelector('.selector-bar')).toBeInTheDocument()
  })

  it('renders the month select with 8 options (all + 7 months)', () => {
    render(<ExcelSelector {...defaultProps} />)
    const monthSelect = screen.getByLabelText(/Filtrar por Mes/i)
    const options = within(monthSelect).getAllByRole('option')
    expect(options).toHaveLength(8)
  })

  it('renders the office select with 4 options (all + 3 offices)', () => {
    render(<ExcelSelector {...defaultProps} />)
    const officeSelect = screen.getByLabelText(/Filtrar por Sede/i)
    const options = within(officeSelect).getAllByRole('option')
    expect(options).toHaveLength(4)
  })

  it('calls setSelectedMonth when month selection changes', () => {
    render(<ExcelSelector {...defaultProps} />)
    const monthSelect = screen.getByLabelText(/Filtrar por Mes/i)
    fireEvent.change(monthSelect, { target: { value: 'FEBRERO' } })
    expect(defaultProps.setSelectedMonth).toHaveBeenCalledWith('FEBRERO')
  })

  it('calls setSelectedOffice when office selection changes', () => {
    render(<ExcelSelector {...defaultProps} />)
    const officeSelect = screen.getByLabelText(/Filtrar por Sede/i)
    fireEvent.change(officeSelect, { target: { value: 'PLACILLA' } })
    expect(defaultProps.setSelectedOffice).toHaveBeenCalledWith('PLACILLA')
  })

  it('download button is enabled when isDownloading=false', () => {
    render(<ExcelSelector {...defaultProps} />)
    const button = screen.getByRole('button')
    expect(button).not.toBeDisabled()
  })

  it('download button is disabled when isDownloading=true', () => {
    render(<ExcelSelector {...defaultProps} isDownloading={true} />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('shows "Generando..." text on the button when isDownloading=true', () => {
    render(<ExcelSelector {...defaultProps} isDownloading={true} />)
    expect(screen.getByText('Generando...')).toBeInTheDocument()
  })
})
