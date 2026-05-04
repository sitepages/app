'use client'

import type { StatementPreviewEntry } from '@/lib/statement-classifier'
import type { ItauEntryType }         from '@/lib/itau-parser'

interface Category { id: string; name: string }

interface Props {
  entries:          StatementPreviewEntry[]
  categories:       Category[]
  onToggle:         (index: number) => void
  onChangeCategory: (index: number, categoryId: string) => void
}

const TYPE_LABEL: Record<ItauEntryType, string> = {
  PIX_SENT:           'Pix',
  PIX_RECEIVED:       'Pix recebido',
  PIX_QR_EXPENSE:     'Pix QR',
  PIX_QR_INCOME:      'Pix QR',
  BOLETO:             'Boleto',
  CARD_PAYMENT:       'Fatura',
  SALARY:             'Salário',
  DIRECT_DEBIT:       'Débito auto',
  DEBIT_PURCHASE:     'Débito',
  INTERNAL_TRANSFER:  'TBI',
  UNKNOWN:            'Outro',
}

const TYPE_COLOR: Record<ItauEntryType, string> = {
  PIX_SENT:           '#3B82F6',
  PIX_RECEIVED:       '#00C47A',
  PIX_QR_EXPENSE:     '#60A5FA',
  PIX_QR_INCOME:      '#34D399',
  BOLETO:             '#8B5CF6',
  CARD_PAYMENT:       '#F87171',
  SALARY:             '#00C47A',
  DIRECT_DEBIT:       '#F59E0B',
  DEBIT_PURCHASE:     '#6B7280',
  INTERNAL_TRANSFER:  '#6B7280',
  UNKNOWN:            '#6B7280',
}

function fmt(amount: number) {
  return Math.abs(amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function TypeBadge({ type }: { type: ItauEntryType }) {
  return (
    <span style={{
      fontSize:     11,
      fontWeight:   600,
      padding:      '2px 7px',
      borderRadius: 20,
      background:   `${TYPE_COLOR[type]}18`,
      color:        TYPE_COLOR[type],
      whiteSpace:   'nowrap',
    }}>
      {TYPE_LABEL[type]}
    </span>
  )
}

export default function StatementPreview({ entries, categories, onToggle, onChangeCategory }: Props) {
  const visibleEntries = entries.filter(pe => !pe.entry.shouldIgnore || pe.entry.entryType === 'CARD_PAYMENT')

  const toImport  = entries.filter(pe => pe.checked)
  const totalExp  = toImport.filter(pe => !pe.isIncome).reduce((s, pe) => s + Math.abs(pe.entry.amount), 0)
  const totalInc  = toImport.filter(pe => pe.isIncome).reduce((s, pe) => s + Math.abs(pe.entry.amount), 0)
  const ignoredAuto = entries.filter(pe => pe.entry.shouldIgnore)

  const cardPayments = ignoredAuto.filter(pe => pe.entry.entryType === 'CARD_PAYMENT')
  const internalTxs  = ignoredAuto.filter(pe => pe.entry.entryType === 'INTERNAL_TRANSFER')

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 space-y-1">
            <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
              ✓ {toImport.length} lançamentos para importar
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--danger)', fontFamily: 'DM Mono, monospace' }}>{fmt(totalExp)}</span>
              {' em despesas'}
              {totalInc > 0 && (
                <>
                  {' · '}
                  <span style={{ color: 'var(--brand)', fontFamily: 'DM Mono, monospace' }}>{fmt(totalInc)}</span>
                  {' em receitas'}
                </>
              )}
            </p>
          </div>
          {ignoredAuto.length > 0 && (
            <div style={{ paddingTop: 2 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                ⊘ {ignoredAuto.length} ignorados automaticamente
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {cardPayments.length > 0 && 'Pagamento de fatura do cartão'}
                {cardPayments.length > 0 && internalTxs.length > 0 && ' · '}
                {internalTxs.length > 0 && 'Transferência interna'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Table (desktop) */}
      <div className="hidden md:block" style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', width: 36 }}></th>
              <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Data</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tipo</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Descrição</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Categoria</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((pe, i) => {
              const ignored = pe.entry.shouldIgnore
              const isIncome = pe.isIncome

              return (
                <tr
                  key={i}
                  style={{
                    borderTop: '1px solid var(--border)',
                    opacity:   ignored ? 0.45 : 1,
                    background: pe.duplicate ? 'rgba(245,158,11,0.04)' : 'transparent',
                  }}
                >
                  {/* Checkbox */}
                  <td style={{ padding: '10px 14px' }}>
                    {!ignored && (
                      <input
                        type="checkbox"
                        checked={pe.checked}
                        onChange={() => onToggle(i)}
                        disabled={pe.entry.entryType === 'CARD_PAYMENT'}
                        style={{ cursor: 'pointer', accentColor: 'var(--brand)', width: 15, height: 15 }}
                      />
                    )}
                  </td>

                  {/* Date */}
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'DM Mono, monospace', fontSize: 12 }}>
                    {pe.entry.date.split('-').reverse().join('/')}
                  </td>

                  {/* Type */}
                  <td style={{ padding: '10px 14px' }}>
                    <TypeBadge type={pe.entry.entryType} />
                  </td>

                  {/* Description */}
                  <td style={{ padding: '10px 14px', color: 'var(--text)', maxWidth: 240 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pe.entry.cleanDescription}
                    </span>
                    {pe.entry.pixRecipient && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pe.entry.pixRecipient}</span>
                    )}
                    {pe.duplicate && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--warning)', background: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: 8, marginLeft: 6 }}>
                        Duplicado
                      </span>
                    )}
                  </td>

                  {/* Category */}
                  <td style={{ padding: '10px 14px' }}>
                    {!ignored && !isIncome && (
                      <select
                        value={pe.category_id ?? ''}
                        onChange={e => onChangeCategory(i, e.target.value)}
                        className="input"
                        style={{ fontSize: 12, padding: '4px 8px', minWidth: 130 }}
                      >
                        <option value="">Sem categoria</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                    {isIncome && (
                      <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 600 }}>Receita</span>
                    )}
                  </td>

                  {/* Amount */}
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>
                    {ignored ? (
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 8 }}>
                        Ignorado
                      </span>
                    ) : (
                      <span style={{ color: pe.entry.amount < 0 ? 'var(--danger)' : 'var(--brand)' }}>
                        {pe.entry.amount < 0 ? '−' : '+'} {fmt(pe.entry.amount)}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile) */}
      <div className="md:hidden space-y-2">
        {entries.map((pe, i) => {
          const ignored  = pe.entry.shouldIgnore
          const isIncome = pe.isIncome

          return (
            <div
              key={i}
              style={{
                background:    'var(--bg-card)',
                border:        '1px solid var(--border)',
                borderRadius:  10,
                padding:       '12px 14px',
                opacity:       ignored ? 0.45 : 1,
                display:       'flex',
                gap:           12,
                alignItems:    'flex-start',
              }}
            >
              {!ignored && (
                <input
                  type="checkbox"
                  checked={pe.checked}
                  onChange={() => onToggle(i)}
                  disabled={pe.entry.entryType === 'CARD_PAYMENT'}
                  style={{ marginTop: 2, cursor: 'pointer', accentColor: 'var(--brand)', width: 15, height: 15, flexShrink: 0 }}
                />
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <TypeBadge type={pe.entry.entryType} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
                    {pe.entry.date.split('-').reverse().join('/')}
                  </span>
                  {pe.duplicate && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--warning)', background: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: 8 }}>
                      Duplicado
                    </span>
                  )}
                </div>

                <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pe.entry.cleanDescription}
                </p>

                {!ignored && !isIncome && (
                  <select
                    value={pe.category_id ?? ''}
                    onChange={e => onChangeCategory(i, e.target.value)}
                    className="input mt-2"
                    style={{ fontSize: 12, padding: '4px 8px', width: '100%' }}
                  >
                    <option value="">Sem categoria</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                {ignored ? (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ignorado</span>
                ) : (
                  <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: 13, color: pe.entry.amount < 0 ? 'var(--danger)' : 'var(--brand)' }}>
                    {pe.entry.amount < 0 ? '−' : '+'}{fmt(pe.entry.amount)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
