# Finança Casa — Project Instructions for Claude

## Project Identity
**Finança Casa** is a Portuguese-language couple's personal finance app. All UI text, variable names (in user-facing content), and category labels are in **Brazilian Portuguese**. Code identifiers (functions, types, hooks) are in English. The app is shared between two household members and all data is scoped to a `household_id`.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5, strict mode |
| Styling | Tailwind CSS 3.4 + CSS custom properties (no CSS-in-JS libs) |
| Backend | Supabase (auth, database, storage) |
| Charts | Recharts |
| Icons | Lucide React |
| Font | Geist (sans + mono) |

Path alias: `@/*` → `./src/*`

---

## Architecture

### File Structure
```
src/
  app/                  # Next.js App Router pages
    login/              # Auth page + server actions
    dashboard/          # All authenticated pages
  components/
    layout/Sidebar.tsx  # Main navigation
    import/             # CSV import UI components
  hooks/                # All data-fetching logic (React hooks)
  lib/                  # Pure utility functions (no React)
  services/supabase/    # Supabase client instances (client.ts + server.ts)
  middleware.ts         # Auth redirect guard
```

### Data Flow Pattern
- Pages are **Server Components** where possible; auth is checked server-side.
- Data fetching lives in **custom hooks** (`src/hooks/use*.ts`) — not in pages or components directly.
- Hooks return `{ data, loading, error, refetch }` (or similar shape).
- Components receive data as props or call hooks directly.
- No global state manager (no Redux, no Zustand). Hooks use `useState` + `useEffect` + `useCallback`.

### Supabase Query Pattern
```typescript
let query = supabase.from('table').select('...')
if (filter) query = query.eq('field', value)
const { data, error } = await query
```
Always filter by `household_id`. Use `deleted_at` for soft deletes — never hard-delete transactions.

---

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `accounts` | Checking, savings, investment, food card balances |
| `transactions` | All expenses/income (soft-deleted via `deleted_at`) |
| `income_entries` | Salary, freelance, investment returns |
| `budgets` | Monthly category spending limits |
| `installment_plans` | Installment tracking (parcelas) |
| `installment_payments` | Per-installment payment history |
| `debts` | Debt tracking with interest calculation |
| `debt_payments` | Debt payment history |
| `savings_goals` | Savings targets |
| `categories` | Global category definitions (id, name, icon, color) |
| `category_rules` | Keyword → category auto-classification rules |
| `fixed_costs` | Fixed/variable cost definitions |
| `grocery_sessions` | Store visits |
| `grocery_items` | Items per session |
| `grocery_products` | Product catalog |
| `household_members` | Members of the household |
| `import_batches` | CSV import metadata |

**Critical fields:**
- `household_id` — on every table; always filter by it
- `competence_month` — string `"YYYY-MM"` for month-based grouping (≠ transaction date)
- `deleted_at` — soft delete timestamp on `transactions`
- `transaction_type`: `EXPENSE | INCOME | TRANSFER`
- `status` on transactions: `PAID | PENDING | PLANNED`
- Account types: `CHECKING | SAVINGS | INVESTMENT | CDI | FOOD_CARD | OTHER`

**Patrimony calculation:**
```
disponível = sum(CHECKING accounts)
investido  = sum(SAVINGS + INVESTMENT + CDI accounts)
total      = sum(all except FOOD_CARD)
```

---

## Auth & Routing

- **Middleware** (`src/middleware.ts`) guards all routes: unauthenticated → `/login`, authenticated at `/login` → `/dashboard`.
- Server-side auth: `createServerClient` from `services/supabase/server.ts` with cookie handling.
- Browser-side auth: `createBrowserClient` from `services/supabase/client.ts`.
- Login via `supabase.auth.signInWithPassword()` in a Next.js server action.
- `NEXT_PUBLIC_HOUSEHOLD_ID` env var is the shared household UUID.

---

## UI & Styling Conventions

### CSS Variables (theming)
The app uses `data-theme` on `<html>`. Default is **dark**.
```css
/* Key dark-theme variables */
--bg-base: #080C14      /* page background */
--bg-surface: #0D1117   /* sidebar */
--bg-card: #111827      /* cards */
--border: #1F2937
--text: #F0F6FC
--text-muted: #484F58
--brand: #00C47A        /* primary green */
--danger: #F87171
--warning: #F59E0B
--info: #60A5FA
```
Always use CSS variables for colors — never hardcode hex values in new components.

### Reusable CSS Classes (defined in `globals.css`)
```
.card               rounded card container
.btn                base button
.btn-primary        brand-colored button
.btn-secondary      muted button
.btn-ghost          transparent button
.input              form input
.stat-card          data display card
.progress-track     progress bar track
.progress-fill      progress bar fill
.badge              status pill
.nav-item           sidebar navigation link
```

### Animations
```css
.fade-up            0.4s translate Y entrance
.fade-in            0.3s opacity entrance
.fade-up-1 through .fade-up-4   staggered (50ms deltas)
```

### Responsive Layout
| Breakpoint | Behavior |
|-----------|---------|
| ≥ 1024px (desktop) | Full sidebar (240px) |
| 768–1023px (tablet) | Icon-only sidebar (64px) |
| < 768px (mobile) | Drawer + bottom navigation (5 items) |

Always design mobile-first. The sidebar handles all responsiveness internally.

---

## Key Business Logic

### CSV Import Flow (`useImport.ts`)
States: `idle → parsing → classifying → preview → saving → done`

1. Parse Nubank CSV (`lib/csv-parser.ts`): positive amount = EXPENSE, negative = INCOME
2. Sanitize title (`lib/sanitizer.ts`): 6-step pipeline removing tracking codes, noise words
3. Classify category (`lib/classifier.ts`): keyword match against `category_rules`
4. Detect installments (`lib/installment-detector.ts`): regex `"Parcela X/Y"` at end of string
5. Match/create installment plans (`lib/installment-matcher.ts`):
   - Match key: `"CleanDesc|TotalInstallments|Amount"`
   - 0 matches → create new plan
   - 1 match → advance current installment
   - 2+ matches → flag `needs_review = true`

### Budget Status Thresholds
- `ok`: spent < 80% of limit
- `warning`: 80% ≤ spent < 100%
- `exceeded`: spent ≥ 100%

### Debt Interest Types
`NONE | SIMPLE | COMPOUND | PRICE` (Price = French amortization)

### Cost of Living Modes
- **Average**: rolling 3/6/12 month average
- **Month**: single month with 12-month chart

Components: manual fixed costs + manual variable costs + credit card avg + food card avg

---

## Hooks Reference

| Hook | File | Purpose |
|------|------|---------|
| `useTransactions` | `hooks/useTransactions.ts` | Fetch + filter transactions |
| `useAccounts` | `hooks/useAccounts.ts` | Account CRUD + balance summary |
| `useBudgets` | `hooks/useBudgets.ts` | Budget limits + status |
| `useCategories` | `hooks/useCategories.ts` | Global category list (read-only) |
| `useCostOfLiving` | `hooks/useCostOfLiving.ts` | Multi-month cost analysis |
| `useInstallments` | `hooks/useInstallments.ts` | Installment plans + payments |
| `useIncome` | `hooks/useIncome.ts` | Income entries CRUD |
| `useDebts` | `hooks/useDebts.ts` | Debt management + interest |
| `useGoals` | `hooks/useGoals.ts` | Savings goals |
| `useGrocery` | `hooks/useGrocery.ts` | Grocery sessions + items |
| `useFixedCosts` | `hooks/useFixedCosts.ts` | Fixed/variable cost items |
| `useImport` | `hooks/useImport.ts` | CSV import workflow |
| `useTheme` | `hooks/useTheme.ts` | Dark/light toggle |
| `useDeleteTransaction` | `hooks/useDeleteTransaction.ts` | Soft/hard delete |
| `useHouseholdMembers` | `hooks/useHouseholdMembers.ts` | Member list |

---

## Code Conventions

- **No comments** unless the WHY is non-obvious (hidden constraint, workaround, invariant).
- **No extra abstractions** — solve the specific problem, don't generalize.
- **No error handling for impossible scenarios** — trust Supabase types and framework guarantees.
- New pages go in `src/app/dashboard/[feature]/page.tsx`.
- New hooks go in `src/hooks/use[Feature].ts`.
- New utility logic (no React) goes in `src/lib/`.
- When adding a new Supabase table, always filter by `household_id`.
- Soft-delete transactions with `deleted_at`; hard-delete is only for import undo.
- Use `clsx` + `tailwind-merge` for conditional class names.
- `competence_month` is always `"YYYY-MM"` string format.

---

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY    # Supabase anon key
NEXT_PUBLIC_HOUSEHOLD_ID         # Shared household UUID
```

---

## Concrete Implementation Patterns

> These patterns are extracted from the reference files. Follow them exactly.

### Hook pattern (`src/hooks/useGrocery.ts` reference)
```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/services/supabase/client'

export function useFeature(householdId: string) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('table').select('*').eq('household_id', householdId)
    if (error) setError(error.message)
    else setItems(data ?? [])
    setLoading(false)
  }, [householdId])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function createItem(payload: Omit<Item, 'id'>) {
    const supabase = createClient()
    await supabase.from('table').insert({ ...payload, household_id: householdId })
    fetchItems()
  }

  return { items, loading, error, createItem, refetch: fetchItems }
}
```

### Page structure (`src/app/dashboard/grocery/page.tsx` reference)
```typescript
'use client'
// 1. imports
// 2. constants: HOUSEHOLD_ID, SUPABASE_URL, SUPABASE_ANON at top level
// 3. pure helper formatters (fmt, getDefaultMonth, etc.)
// 4. export default function PageName() { ... }  ← main component
// 5. sub-components (modals, forms) at bottom of same file — never in separate files
```

Page layout wrapper: `<div className="p-4 md:p-7 max-w-[1000px] mx-auto">`

Animation sequence:
- Header → `animate-fade-up`
- Stats grid → `animate-fade-up-1`
- Main list/content → `animate-fade-up-2`

Loading state:
```tsx
<div className="flex justify-center py-20">
  <div className="w-5 h-5 rounded-full border-2 animate-spin"
    style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
</div>
```

Empty state:
```tsx
<div className="card flex flex-col items-center justify-center py-20 gap-4 text-center"
  style={{ borderStyle: 'dashed' }}>
  {/* icon + title + subtitle + action buttons */}
</div>
```

Modal overlay:
```tsx
<div style={{
  position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', padding: 24,
}} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
  <div style={{
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 16, padding: 28, width: '100%', maxWidth: 480,
    boxShadow: 'var(--shadow-lg)',
  }}>
    {/* header with title + X button */}
    {/* form content */}
  </div>
</div>
```

Form label:
```tsx
<label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
  style={{ color: 'var(--text-muted)' }}>Label</label>
```

Form action row:
```tsx
<div className="flex gap-3 pt-2">
  <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
  <button type="submit" disabled={saving} className="btn btn-primary flex-1">
    {saving ? 'Salvando...' : 'Salvar'}
  </button>
</div>
```

Monetary values: always `fontFamily: 'DM Mono, monospace'`. Expenses use `color: 'var(--danger)'`.

### Adding a route to Sidebar (`src/components/layout/Sidebar.tsx` reference)
Add to `NAV_GROUPS` array:
```typescript
{ href: '/dashboard/feature', label: 'Nome PT', icon: LucideIconName, color: '#HEX' }
```
Optionally add to `BOTTOM_NAV` for mobile quick access (max 5 items total including "Mais").

### Database — cascade note
`g_list_items` rows are deleted by ON DELETE CASCADE from the parent — no application-level delete logic needed for child rows.

---

## What NOT to do
- Don't use Redux, Zustand, or Context API — hooks are sufficient.
- Don't hardcode colors — use CSS variables.
- Don't add new dependencies without asking — the stack is intentionally minimal.
- Don't use `next/image` for icons — use Lucide React.
- Don't create documentation files, README, or planning .md files — ever.
- Don't translate UI text to English — everything visible to users stays in Portuguese.
- Don't put sub-components (modals, forms) in separate files — keep them at the bottom of the page file.
- Don't implement cascade deletes in code when the DB already has ON DELETE CASCADE.
