# 法力财务专家 - Project TODO

## Phase 1: Database Schema & Migration
- [x] Design and write drizzle/schema.ts (all tables)
- [x] Generate and apply DB migration SQL

## Phase 2: i18n & Global Theme
- [x] Install i18next, react-i18next
- [x] Write zh.json and en.json language packs (full coverage)
- [x] Configure I18nProvider in main.tsx
- [x] Set up global dark/professional theme in index.css

## Phase 3: Backend tRPC Routers
- [x] server/db.ts: query helpers for all tables
- [x] router: config (income/fixed/flexible/repayment CRUD)
- [x] router: transactions (list, create, update, delete, mark-invoiced)
- [x] router: settlement (monthly settlement, savings)
- [x] router: assets (CRUD, daily depreciation calc)
- [x] Seed initial data (income 22900, fixed expenses, flexible budgets, repayments)

## Phase 4: Frontend Framework
- [x] MobileLayout with bottom tab navigation (mobile-first)
- [x] Routes: /, /transactions, /settlement, /assets, /settings
- [x] Language switcher (zh/en) in header
- [x] Auth guard and user display

## Phase 5: Home + Transactions Module
- [x] Home page: monthly budget overview card (income, spent, remaining)
- [x] Transaction list with operator name
- [x] Add transaction form (amount, category, note, date, company-advance toggle)
- [x] Company advance: exclude from personal spend, start 30-day countdown
- [x] Overdue invoice warning: red highlight if >30 days without "invoiced" mark
- [x] Mark as invoiced action

## Phase 6: Monthly Settlement Module
- [x] Settlement calculation: total surplus = income - (fixed + actual flexible + actual repayments)
- [x] Investment amount = surplus × 10% + (flexible budget - actual flexible)
- [x] Settlement triggers savings increase
- [x] Settlement history list

## Phase 7: Asset Dashboard Module
- [x] Asset list with cards
- [x] Add/edit/delete asset (name, purchase price, lifespan years, purchase date)
- [x] Auto-calculate daily depreciation per asset
- [x] Total family daily depreciation display at top
- [x] Value loss progress bar per asset card

## Phase 8: Configuration Management Page
- [x] Income sources CRUD
- [x] Fixed expenses CRUD
- [x] Flexible budgets CRUD
- [x] Repayment plans CRUD (二姐 3000, 妈咪 3000)
- [x] All changes reflected in calculations immediately

## Phase 9: Testing & Delivery
- [x] Vitest tests for settlement calculation logic
- [x] Vitest tests for depreciation calculation
- [x] Vitest tests for advance warning logic (23 tests, all passing)
- [x] TypeScript compiles with 0 errors
- [x] Save checkpoint
- [x] Deliver to user

## Bug Fixes
- [x] Fix settlement.getByYearMonth returning undefined (TanStack Query requires non-undefined return)

## UI Overhaul & Custom Auth
- [x] Replace Manus OAuth with custom register/login (email + password)
- [x] Add password hashing (bcrypt) and JWT-based session
- [x] Create register page with form validation
- [x] Create login page with professional design
- [x] Add auth guard: redirect unauthenticated users to login
- [x] Redesign Home page: better card layout, gradients, micro-animations
- [x] Redesign Transactions page: improved list items, filter tabs, add form
- [x] Redesign Settlement page: clearer calculation breakdown, better history
- [x] Redesign Assets page: enhanced cards with progress bars, depreciation visuals
- [x] Redesign Settings page: cleaner section layout, inline editing
- [x] Optimize MobileLayout: refined bottom nav, header, transitions
- [x] Update i18n keys for new auth pages (zh/en)
- [x] Fix auth.me to exclude password field (security)
- [x] Run all 31 tests - all passing
- [x] TypeScript compilation - 0 errors
