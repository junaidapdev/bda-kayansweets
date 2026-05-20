# KNC Discount

Purchase & rebate tracking tool for managing supplier discounts, credit notes, and BDA (Business Development Allowance) calculations.

## Structure

```
knc-discount/
├── frontend/      # React + TypeScript (Vite)
└── supabase/      # Migrations, seed data, edge functions
```

## Roles

| Role | Access |
|---|---|
| **Accounts Team** | Full CRUD — logs purchases, manages credit notes, verifies rebates |
| **Purchase Manager** | Read-only — views all data and analytics dashboard |

## Getting started

### Frontend

```bash
cd frontend
cp .env.local.example .env.local   # add your Supabase credentials
npm install
npm run dev
```

### Supabase

```bash
npx supabase start       # local dev
npx supabase db push      # apply migrations
```

### Single admin login

The frontend login uses username `bdakayan` and maps it to the Supabase Auth email `bda@kayan.com`.
Create that user in Supabase Auth, confirm the user, and set the password in the Supabase dashboard. Do not commit the password to the repo.

Run `supabase/migration_v5_single_admin_rls.sql` after creating the auth user to enable RLS and grant access only to that admin account.
