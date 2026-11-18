import { useState, useEffect, useMemo } from 'react'
import {
  Calendar,
  Tag,
  MapPin,
  Sprout,
  Printer,
  ArrowDownLeft,
  ArrowUpRight,
  Activity,
  Info,
  Download,
} from 'lucide-react'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { Select } from '../components/ui/Select.tsx'
import { ExportModal } from '../components/export/ExportModal.tsx'
import { getTransactions } from '../services/transactionService.ts'
import { getAllCategories } from '../services/categoryService.ts'
import { getAllLands } from '../services/landService.ts'
import { getAllCrops } from '../services/cropService.ts'
import {
  getMonthlyFinancials,
  getCategoryFinancials,
  getLandFinancials,
  getCropFinancials,
  type MonthSummary,
  type EntityFinancialSummary,
} from '../services/reportService.ts'
import type { Transaction } from '../data/db/schema.ts'
import {
  calculateFinancialSummary,
  formatLKR,
} from '../utils/calculations.ts'
import { getTodayColombo } from '../utils/date.ts'

export function Reports() {
  const currentYear = getTodayColombo().slice(0, 4)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [activeTab, setActiveTab] = useState<'monthly' | 'categories' | 'lands' | 'crops'>('monthly')

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthSummary[]>([])
  const [expenseCategories, setExpenseCategories] = useState<EntityFinancialSummary[]>([])
  const [incomeCategories, setIncomeCategories] = useState<EntityFinancialSummary[]>([])
  const [landSummaries, setLandSummaries] = useState<EntityFinancialSummary[]>([])
  const [cropSummaries, setCropSummaries] = useState<EntityFinancialSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  async function loadReportData() {
    setLoading(true)
    try {
      const txFilters =
        selectedYear === 'all'
          ? undefined
          : {
              startDate: `${selectedYear}-01-01`,
              endDate: `${selectedYear}-12-31`,
            }

      const [filteredTx, allCategories, allLands, allCrops] = await Promise.all([
        getTransactions(txFilters),
        getAllCategories(true),
        getAllLands(true),
        getAllCrops(true),
      ])

      setTransactions(filteredTx)

      const [monthly, expCats, incCats, lands, crops] = await Promise.all([
        getMonthlyFinancials(
          selectedYear === 'all' ? undefined : selectedYear,
          filteredTx
        ),
        getCategoryFinancials(filteredTx, 'expense', allCategories),
        getCategoryFinancials(filteredTx, 'income', allCategories),
        getLandFinancials(filteredTx, allLands),
        getCropFinancials(filteredTx, allCrops),
      ])

      setMonthlyData(monthly)
      setExpenseCategories(expCats)
      setIncomeCategories(incCats)
      setLandSummaries(lands)
      setCropSummaries(crops)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReportData()
  }, [selectedYear])

  const totals = useMemo(() => calculateFinancialSummary(transactions), [transactions])

  return (
    <div className="mx-auto max-w-6xl py-8 sm:py-10 print:py-2">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Workspace / Reports</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Cultivation & Financial Reports</h1>
          <p className="mt-2 text-sm text-muted">
            Summaries of income, expenses, and net returns by month, category, land, and crop.
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-36 text-xs"
          >
            <option value="all">All Records</option>
            <option value={currentYear}>{currentYear} (Current Year)</option>
            <option value={String(Number(currentYear) - 1)}>{Number(currentYear) - 1}</option>
            <option value={String(Number(currentYear) - 2)}>{Number(currentYear) - 2}</option>
          </Select>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={15} /> Print Report
          </Button>
          <Button onClick={() => setIsExportModalOpen(true)}>
            <Download size={15} /> Export Data
          </Button>
        </div>
      </div>

      {/* Reporting Disclaimer */}
      <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-border bg-subtle/70 p-3 text-xs text-muted">
        <Info size={16} className="mt-0.5 shrink-0 text-muted" />
        <p>
          <strong>Reporting Basis:</strong> Derived from recorded farm transactions in your local database.
          Figures represent operational summaries for cultivation management and do not constitute formal statutory or tax accounting.
        </p>
      </div>

      {/* KPI Stat Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Total Recorded Income</span>
            <div className="grid size-8 place-items-center rounded-lg bg-forest-50 text-forest-700 dark:bg-forest-900/30 dark:text-forest-200">
              <ArrowDownLeft size={17} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-forest-600">{formatLKR(totals.totalIncome)}</p>
          <p className="mt-1 text-xs text-muted">
            {totals.transactionCount} transactions in {selectedYear === 'all' ? 'All records' : selectedYear}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Total Recorded Expenses</span>
            <div className="grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
              <ArrowUpRight size={17} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-amber-600">{formatLKR(totals.totalExpenses)}</p>
          <p className="mt-1 text-xs text-muted">Cultivation, inputs, wages, and upkeep</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Net Return</span>
            <div className="grid size-8 place-items-center rounded-lg bg-subtle text-text">
              <Activity size={17} />
            </div>
          </div>
          <p
            className={`mt-3 text-2xl font-bold ${
              totals.netBalance >= 0 ? 'text-forest-600' : 'text-red-600'
            }`}
          >
            {formatLKR(totals.netBalance)}
          </p>
          <p className="mt-1 text-xs text-muted">Net surplus / deficit for the selected period</p>
        </Card>
      </div>

      {/* View Tabs */}
      <div className="mt-8 flex flex-wrap gap-2 border-b border-border pb-3 print:hidden">
        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
            activeTab === 'monthly'
              ? 'bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-100'
              : 'text-muted hover:bg-subtle hover:text-text'
          }`}
        >
          <Calendar size={16} /> Monthly Performance
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
            activeTab === 'categories'
              ? 'bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-100'
              : 'text-muted hover:bg-subtle hover:text-text'
          }`}
        >
          <Tag size={16} /> By Category
        </button>
        <button
          onClick={() => setActiveTab('lands')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
            activeTab === 'lands'
              ? 'bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-100'
              : 'text-muted hover:bg-subtle hover:text-text'
          }`}
        >
          <MapPin size={16} /> By Cultivation Land
        </button>
        <button
          onClick={() => setActiveTab('crops')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
            activeTab === 'crops'
              ? 'bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-100'
              : 'text-muted hover:bg-subtle hover:text-text'
          }`}
        >
          <Sprout size={16} /> By Crop
        </button>
      </div>

      {/* Tab 1: Monthly Breakdown */}
      {activeTab === 'monthly' && (
        <div className="mt-6">
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border bg-subtle/30">
              <h3 className="font-semibold text-text text-sm">Monthly Income & Expenses</h3>
              <p className="text-xs text-muted mt-0.5">
                Breakdown of financial records grouped by calendar month.
              </p>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-muted">Calculating monthly metrics...</div>
            ) : monthlyData.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted">
                No recorded transactions for the selected period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-subtle/50 text-xs font-semibold text-muted uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Month</th>
                      <th className="py-3 px-4 text-right">Income (LKR)</th>
                      <th className="py-3 px-4 text-right">Expense (LKR)</th>
                      <th className="py-3 px-4 text-right">Net Balance (LKR)</th>
                      <th className="py-3 px-4 text-center">Tx Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {monthlyData.map((row) => {
                      const isSurplus = row.net >= 0
                      const d = new Date(`${row.month}-01`)
                      const label = new Intl.DateTimeFormat('en-US', {
                        month: 'long',
                        year: 'numeric',
                        timeZone: 'UTC',
                      }).format(d)

                      return (
                        <tr key={row.month} className="hover:bg-subtle/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-text">{label}</td>
                          <td className="py-3.5 px-4 text-right font-medium text-forest-600">
                            {formatLKR(row.income)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-amber-600">
                            {formatLKR(row.expense)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold">
                            <span className={isSurplus ? 'text-forest-600' : 'text-red-600'}>
                              {isSurplus ? '+' : ''}
                              {formatLKR(row.net)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center text-xs text-muted">
                            {row.transactionCount}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 2: Category Breakdown */}
      {activeTab === 'categories' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Expenses by Category */}
          <Card className="p-5">
            <h3 className="font-semibold text-text text-sm">Expenses by Category</h3>
            <p className="text-xs text-muted mt-0.5">Distribution of cultivation spending</p>

            {expenseCategories.length === 0 ? (
              <p className="mt-6 text-xs text-muted italic">No expenses recorded for this period.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {expenseCategories.map((cat) => (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-text">{cat.name}</span>
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        {formatLKR(cat.expense)} ({cat.percentageOfExpense}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-subtle">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${cat.percentageOfExpense || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Income by Category */}
          <Card className="p-5">
            <h3 className="font-semibold text-text text-sm">Income by Category</h3>
            <p className="text-xs text-muted mt-0.5">Distribution of farm revenues</p>

            {incomeCategories.length === 0 ? (
              <p className="mt-6 text-xs text-muted italic">No income recorded for this period.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {incomeCategories.map((cat) => (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-text">{cat.name}</span>
                      <span className="font-semibold text-forest-600">
                        {formatLKR(cat.income)} ({cat.percentageOfIncome}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-subtle">
                      <div
                        className="h-full bg-forest-600 rounded-full transition-all"
                        style={{ width: `${cat.percentageOfIncome || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 3: Land Breakdown */}
      {activeTab === 'lands' && (
        <div className="mt-6">
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border bg-subtle/30">
              <h3 className="font-semibold text-text text-sm">Financials by Cultivation Land</h3>
              <p className="text-xs text-muted mt-0.5">
                Every transaction requires a land assignment; view profitability per land.
              </p>
            </div>

            {landSummaries.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted">No land transactions recorded.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-subtle/50 text-xs font-semibold text-muted uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Cultivation Land</th>
                      <th className="py-3 px-4 text-right">Income (LKR)</th>
                      <th className="py-3 px-4 text-right">Expense (LKR)</th>
                      <th className="py-3 px-4 text-right">Net Return (LKR)</th>
                      <th className="py-3 px-4 text-center">Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {landSummaries.map((land) => {
                      const isSurplus = land.net >= 0
                      return (
                        <tr key={land.id} className="hover:bg-subtle/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-text flex items-center gap-1.5">
                            <MapPin size={14} className="text-muted" />
                            {land.name}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-forest-600">
                            {formatLKR(land.income)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-amber-600">
                            {formatLKR(land.expense)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold">
                            <span className={isSurplus ? 'text-forest-600' : 'text-red-600'}>
                              {isSurplus ? '+' : ''}
                              {formatLKR(land.net)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center text-xs text-muted">
                            {land.transactionCount}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 4: Crop Breakdown */}
      {activeTab === 'crops' && (
        <div className="mt-6">
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border bg-subtle/30">
              <h3 className="font-semibold text-text text-sm">Financials by Crop</h3>
              <p className="text-xs text-muted mt-0.5">
                Summary for transactions where a specific crop was assigned.
              </p>
            </div>

            {cropSummaries.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted">
                No transactions with assigned crops found for this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-subtle/50 text-xs font-semibold text-muted uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Crop</th>
                      <th className="py-3 px-4 text-right">Income (LKR)</th>
                      <th className="py-3 px-4 text-right">Expense (LKR)</th>
                      <th className="py-3 px-4 text-right">Net Return (LKR)</th>
                      <th className="py-3 px-4 text-center">Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cropSummaries.map((crop) => {
                      const isSurplus = crop.net >= 0
                      return (
                        <tr key={crop.id} className="hover:bg-subtle/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-text flex items-center gap-1.5">
                            <Sprout size={14} className="text-forest-600" />
                            {crop.name}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-forest-600">
                            {formatLKR(crop.income)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-amber-600">
                            {formatLKR(crop.expense)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold">
                            <span className={isSurplus ? 'text-forest-600' : 'text-red-600'}>
                              {isSurplus ? '+' : ''}
                              {formatLKR(crop.net)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center text-xs text-muted">
                            {crop.transactionCount}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Export to Excel Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  )
}
