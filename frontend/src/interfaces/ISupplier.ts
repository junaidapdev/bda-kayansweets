import type { IRebateRules } from './IBDARules'

export interface ISupplier {
  id: string
  name: string
  rebate_rules: IRebateRules
  target_amount: number | null
  created_at: string
}
