import { useMemo } from 'react'
import { useStore } from '../store/useStore'

export function useFilteredData() {
  const { data, metrics, filters } = useStore()

  const filteredRows = useMemo(() => {
    if (!data?.rows) return []
    return data.rows.filter((r) => {
      if (filters.department && r.department !== filters.department &&
          r.employee?.department !== filters.department) return false
      if (filters.taskCategory && r.task_category !== filters.taskCategory) return false
      return true
    })
  }, [data, filters])

  const filteredMetrics = useMemo(() => {
    if (!metrics) return null
    if (!filters.department && !filters.taskCategory) return metrics

    const rows = filteredRows
    const totalMins = rows.reduce((s, r) => s + r.duration_minutes, 0)
    const repMins = rows.filter((r) => r.is_repetitive === true).reduce((s, r) => s + r.duration_minutes, 0)
    const repWithSalary = rows.filter((r) => r.is_repetitive === true && r.employee?.hourly_rate_inr)
    const repCost = repWithSalary.reduce((s, r) => s + (r.duration_minutes / 60) * r.employee.hourly_rate_inr, 0)

    return {
      ...metrics,
      headline: {
        ...metrics.headline,
        total_hours: +(totalMins / 60).toFixed(2),
        repetitive_hours: +(repMins / 60).toFixed(2),
        repetitive_pct: +(totalMins > 0 ? (repMins / totalMins) * 100 : 0).toFixed(1),
        recoverable_hours_per_month: +((repMins * 0.7) / 60 / 4 * 4.33).toFixed(1),
        recoverable_inr_per_month: +((repCost * 0.7) / 4 * 4.33).toFixed(0),
      },
    }
  }, [filteredRows, metrics, filters])

  return { filteredRows, filteredMetrics }
}
