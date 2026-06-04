// ─── WORKFLOW DEFINITIONS ─────────────────────────────────────────────────────

export type TaskStatus = "pending" | "complete" | "flagged" | "skipped";

export interface SubTask {
  key: string;
  label: string;
  hint?: string;
}

export interface WorkflowTask {
  key: string;
  label: string;
  category: string;
  hint?: string;
  subTasks?: SubTask[];
  blockedBy?: string[];
  qboLink?: string;      // Direct QBO deep link
  qboHelpLink?: string;  // QBO Help Center article
  // Tier visibility: if set, only show for clients with serviceLevel in this list
  tiers?: ("basic" | "growth" | "premium")[];
}

export interface Workflow {
  type: string;
  label: string;
  icon: string;
  description: string;
  tasks: WorkflowTask[];
}

export const WORKFLOWS: Workflow[] = [
  {
    type: "monthly_close",
    label: "Monthly Close",
    icon: "calendar-check",
    description: "End-of-month bookkeeping close checklist",
    tasks: [
      {
        key: "mc_bank_feeds",
        label: "Verify Bank Feeds Are Current",
        category: "Pre-Close",
        hint: "Confirm all bank accounts have synced in QBO. Flag any disconnected feeds before starting.",
        qboLink: "https://app.qbo.intuit.com/app/banking",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/banking/connect-bank-credit-card-accounts-quickbooks/L4yDAHMNH_US_en_US",
        subTasks: [
          { key: "mc_bank_feeds_checking", label: "Main checking account synced" },
          { key: "mc_bank_feeds_fuel", label: "Fuel card / EFS / Comdata synced" },
          { key: "mc_bank_feeds_cc", label: "Credit cards synced" },
        ],
      },
      {
        key: "mc_categorize_transactions",
        label: "Categorize All Transactions",
        category: "Pre-Close",
        hint: "Review uncategorized items in QBO. Use standard categories: Fuel, Maintenance, Insurance, Revenue per Load, Payroll.",
        qboLink: "https://app.qbo.intuit.com/app/banking",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/banking/categorize-match-online-bank-transactions-online/L1bTafTz3_US_en_US",
        blockedBy: ["mc_bank_feeds"],
        subTasks: [
          { key: "mc_cat_fuel", label: "Fuel purchases categorized" },
          { key: "mc_cat_maintenance", label: "Maintenance / repairs categorized" },
          { key: "mc_cat_insurance", label: "Insurance payments categorized" },
          { key: "mc_cat_payroll", label: "Payroll / driver pay categorized" },
          { key: "mc_cat_revenue", label: "Load revenue / factoring deposits categorized" },
          { key: "mc_cat_misc", label: "Misc / uncategorized items resolved" },
        ],
      },
      {
        key: "mc_reconcile_bank",
        label: "Reconcile Bank Accounts",
        category: "Reconciliation",
        hint: "Match QBO transactions to bank statement. Investigate any discrepancies before closing.",
        qboLink: "https://app.qbo.intuit.com/app/reconcile",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/statement-reconciliation/reconcile-account-quickbooks-online/L3XzsllsK_US_en_US",
        blockedBy: ["mc_categorize_transactions"],
        subTasks: [
          { key: "mc_rec_checking", label: "Checking account reconciled" },
          { key: "mc_rec_savings", label: "Savings / reserve account reconciled (if applicable)" },
        ],
      },
      {
        key: "mc_reconcile_cc",
        label: "Reconcile Credit Cards",
        category: "Reconciliation",
        hint: "Match all credit card charges to statements. Check for fuel card discrepancies.",
        qboLink: "https://app.qbo.intuit.com/app/reconcile",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/statement-reconciliation/reconcile-account-quickbooks-online/L3XzsllsK_US_en_US",
        blockedBy: ["mc_categorize_transactions"],
      },
      {
        key: "mc_ifta",
        label: "Update IFTA Mileage & Fuel Records",
        category: "Trucking-Specific",
        hint: "Pull fuel receipts by state. Update mileage log per truck. Quarterly filing is based on this monthly data.",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/reports/run-reports-in-quickbooks-online/00/186429",
        blockedBy: ["mc_categorize_transactions"],
        subTasks: [
          { key: "mc_ifta_fuel", label: "Fuel gallons by state recorded" },
          { key: "mc_ifta_miles", label: "Miles by state recorded per truck" },
          { key: "mc_ifta_receipts", label: "All fuel receipts attached / filed" },
        ],
      },
      {
        key: "mc_fuel_surcharge",
        label: "Verify Fuel Surcharge Revenue",
        category: "Trucking-Specific",
        hint: "Confirm fuel surcharge amounts on invoices match broker settlements. Discrepancies affect revenue accuracy.",
        qboLink: "https://app.qbo.intuit.com/app/invoices",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/invoicing/create-invoices-quickbooks-online/L7gSzvCld_US_en_US",
        blockedBy: ["mc_categorize_transactions"],
      },
      {
        key: "mc_ar",
        label: "Review Accounts Receivable / AR Aging",
        category: "AR / AP",
        hint: "Pull AR aging report in QBO. Flag invoices 30+ days past due. Confirm factoring advances are matched to invoices.",
        qboLink: "https://app.qbo.intuit.com/app/reports/detail?reportName=AgedReceivables",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/accounts-receivable/get-started-customer-transaction-workflows-online/L3pkPaW5h_US_en_US",
        blockedBy: ["mc_reconcile_bank"],
        subTasks: [
          { key: "mc_ar_aging", label: "AR aging report reviewed" },
          { key: "mc_ar_factoring", label: "Factoring advances matched to invoices" },
          { key: "mc_ar_disputes", label: "Disputed/short-pay invoices flagged" },
        ],
      },
      {
        key: "mc_ap",
        label: "Review Accounts Payable",
        category: "AR / AP",
        hint: "Confirm all vendor bills are entered. Check truck payments, trailer leases, and ELD subscription renewals.",
        qboLink: "https://app.qbo.intuit.com/app/reports/detail?reportName=AgedPayables",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/pay-bills/online-bill-pay/L8p08lKIW_US_en_US",
        blockedBy: ["mc_reconcile_bank"],
        subTasks: [
          { key: "mc_ap_loans", label: "Truck/equipment loan payments recorded" },
          { key: "mc_ap_vendors", label: "Vendor bills (ELD, permits, etc.) entered" },
        ],
      },
      {
        key: "mc_depreciation",
        label: "Post Depreciation Entries",
        category: "Journal Entries",
        hint: "Post monthly depreciation for trucks, trailers, and equipment. Refer to fixed asset schedule.",
        qboLink: "https://app.qbo.intuit.com/app/journal",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/accounting-bookkeeping/create-journal-entry-quickbooks-online/L6Bzy9mT9_US_en_US",
        blockedBy: ["mc_reconcile_bank"],
      },
      {
        key: "mc_owner_op_settlement",
        label: "Reconcile Owner-Operator Settlements",
        category: "Trucking-Specific",
        hint: "Match settlement statements to QBO entries. Verify per-load deductions (fuel advances, insurance, escrow) are recorded correctly.",
        qboLink: "https://app.qbo.intuit.com/app/expenses",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/direct-deposits/pay-contractors-direct-deposit-quickbooks-online/L1yfULhFL_US_en_US",
        blockedBy: ["mc_reconcile_bank"],
        subTasks: [
          { key: "mc_oo_settlements", label: "Settlement statements received from all owner-ops" },
          { key: "mc_oo_deductions", label: "Deductions (fuel advance, escrow, insurance) reconciled" },
          { key: "mc_oo_net_pay", label: "Net pay amounts match QBO entries" },
        ],
      },
      {
        key: "mc_pl_review",
        label: "Review Profit & Loss Statement",
        category: "Reporting",
        hint: "Pull P&L in QBO. Check profit per truck, fuel cost ratio, and any unusual variances from prior month.",
        qboLink: "https://app.qbo.intuit.com/app/reports/detail?reportName=ProfitAndLoss",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/profit-loss/run-a-profit-and-loss-report-in-quickbooks-online/00/186429",
        blockedBy: ["mc_ar", "mc_ap", "mc_depreciation", "mc_owner_op_settlement"],
      },
      {
        key: "mc_cashflow",
        label: "Review Cash Flow",
        category: "Reporting",
        hint: "Verify cash on hand vs. upcoming payables. Flag any 30-day gaps that could affect payroll or fuel.",
        qboLink: "https://app.qbo.intuit.com/app/reports/detail?reportName=CashFlow",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/financial-reports/run-statement-cash-flows/L7f72hT6Q_US_en_US",
        blockedBy: ["mc_pl_review"],
      },
      {
        key: "mc_kpi",
        label: "Update KPI Tracking",
        category: "Reporting",
        hint: "Update: Profit per truck, Cost per mile, Fuel cost %, Revenue vs. prior month.",
        qboLink: "https://app.qbo.intuit.com/app/reports",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/reports/run-reports-in-quickbooks-online/00/186429",
        blockedBy: ["mc_pl_review"],
      },
      {
        key: "mc_deliver_reports",
        label: "Deliver Reports to Client",
        category: "Delivery",
        hint: "Send P&L, Balance Sheet, and any notes to client via email or portal. Note any action items for them.",
        qboLink: "https://app.qbo.intuit.com/app/reports",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/reports/share-and-export-reports-in-quickbooks-online/00/186430",
        blockedBy: ["mc_cashflow", "mc_kpi"],
      },
    ],
  },
  {
    type: "payroll_run",
    label: "Payroll Run",
    icon: "dollar-sign",
    description: "Driver and employee payroll processing checklist",
    tasks: [
      {
        key: "pr_hours",
        label: "Collect & Verify Hours / Miles",
        category: "Pre-Payroll",
        hint: "Gather driver logs, hours of service records, or mileage logs. Verify against dispatch records.",
        subTasks: [
          { key: "pr_hours_drivers", label: "All driver hours/miles submitted" },
          { key: "pr_hours_dispatch", label: "Hours verified against dispatch records" },
        ],
      },
      {
        key: "pr_verify_rates",
        label: "Confirm Pay Rates & Deductions",
        category: "Pre-Payroll",
        hint: "Check for any rate changes, new hires, terminations, or garnishment updates before running.",
        qboLink: "https://app.qbo.intuit.com/app/employees",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/employees/set-up-employees-in-quickbooks-online-payroll/00/369367",
        subTasks: [
          { key: "pr_rates_check", label: "Pay rates confirmed (no changes)" },
          { key: "pr_deductions", label: "Deductions updated (garnishments, benefits, etc.)" },
          { key: "pr_new_hires", label: "New hire / termination changes applied" },
        ],
      },
      {
        key: "pr_run_payroll",
        label: "Run Payroll in QBO",
        category: "Processing",
        hint: "Process payroll in QBO. Review totals before approving — check gross pay, net pay, and tax withholding.",
        qboLink: "https://app.qbo.intuit.com/app/payroll",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/run-payroll/run-payroll-in-quickbooks-online/00/369383",
        blockedBy: ["pr_hours", "pr_verify_rates"],
        subTasks: [
          { key: "pr_run_gross", label: "Gross pay amounts verified" },
          { key: "pr_run_taxes", label: "Tax withholding amounts verified" },
          { key: "pr_run_approved", label: "Payroll approved in QBO" },
        ],
      },
      {
        key: "pr_direct_deposit",
        label: "Confirm Direct Deposit / Check Delivery",
        category: "Processing",
        hint: "Confirm ACH files are submitted or checks are printed and ready.",
        qboLink: "https://app.qbo.intuit.com/app/payroll",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/payroll-processes/set-direct-deposit-employees/L9KvxSLux_US_en_US",
        blockedBy: ["pr_run_payroll"],
      },
      {
        key: "pr_owner_op_pay",
        label: "Process Owner-Operator Pay",
        category: "Owner-Operator",
        hint: "Calculate net settlements for owner-ops: gross load pay minus fuel advances, escrow, insurance, and any chargebacks.",
        qboLink: "https://app.qbo.intuit.com/app/expenses",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/direct-deposits/pay-contractors-direct-deposit-quickbooks-online/L1yfULhFL_US_en_US",
        subTasks: [
          { key: "pr_oo_gross", label: "Gross load revenue per owner-op calculated" },
          { key: "pr_oo_deductions", label: "Deductions applied (fuel advance, escrow, insurance)" },
          { key: "pr_oo_statements", label: "Settlement statements generated" },
          { key: "pr_oo_paid", label: "Payments issued / ACH submitted" },
        ],
      },
      {
        key: "pr_tax_deposits",
        label: "Verify Payroll Tax Deposits",
        category: "Compliance",
        hint: "Confirm federal 941 deposits are scheduled. Check Colorado state withholding and SUTA payments.",
        qboLink: "https://app.qbo.intuit.com/app/payroll/taxes",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/payroll-taxes/pay-payroll-taxes-in-quickbooks-online-payroll/00/369406",
        blockedBy: ["pr_run_payroll"],
        subTasks: [
          { key: "pr_tax_federal", label: "Federal 941 deposit scheduled" },
          { key: "pr_tax_co_wh", label: "Colorado withholding payment scheduled" },
          { key: "pr_tax_suta", label: "SUTA (unemployment) verified" },
        ],
      },
      {
        key: "pr_qbo_journal",
        label: "Post Payroll Journal Entry in QBO",
        category: "Bookkeeping",
        hint: "If QBO payroll is not used, manually post journal entry: Dr. Payroll Expense / Cr. Cash and Payroll Liabilities.",
        qboLink: "https://app.qbo.intuit.com/app/journal",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/accounting-bookkeeping/create-journal-entry-quickbooks-online/L6Bzy9mT9_US_en_US",
        blockedBy: ["pr_run_payroll", "pr_tax_deposits"],
      },
      {
        key: "pr_reconcile",
        label: "Reconcile Payroll to Bank",
        category: "Bookkeeping",
        hint: "Confirm total payroll outflows match bank transactions. Flag any timing differences.",
        qboLink: "https://app.qbo.intuit.com/app/reconcile",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/statement-reconciliation/reconcile-account-quickbooks-online/L3XzsllsK_US_en_US",
        blockedBy: ["pr_qbo_journal"],
      },
    ],
  },
  {
    type: "new_client_onboarding",
    label: "New Client Onboarding",
    icon: "user-plus",
    description: "Setup checklist for onboarding a new trucking client",
    tasks: [
      {
        key: "onb_intake",
        label: "Complete Intake & Service Agreement",
        category: "Admin",
        hint: "Gather: # of trucks, services requested, pricing tier, billing method (ACH/card). Send and collect signed service agreement.",
        subTasks: [
          { key: "onb_intake_trucks", label: "Truck count and service level confirmed" },
          { key: "onb_intake_agreement", label: "Service agreement signed" },
          { key: "onb_intake_billing", label: "Billing method (ACH/card) set up" },
        ],
      },
      {
        key: "onb_crm",
        label: "Create Client in CRM & QBO",
        category: "Setup",
        hint: "Use naming structure: Client Business Name – Service Plan – # of Trucks",
        qboLink: "https://app.qbo.intuit.com/app/customers",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/customers/add-customers-in-quickbooks-online/00/186233",
        blockedBy: ["onb_intake"],
        subTasks: [
          { key: "onb_crm_record", label: "Client record created in CRM" },
          { key: "onb_crm_qbo", label: "Client created in QBO with correct name/structure" },
        ],
      },
      {
        key: "onb_access",
        label: "Gain Required Account Access",
        category: "Access",
        hint: "Rule: No work begins until minimum access is secured.",
        qboLink: "https://app.qbo.intuit.com/app/banking",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/banking/connect-bank-credit-card-accounts-quickbooks/L4yDAHMNH_US_en_US",
        blockedBy: ["onb_crm"],
        subTasks: [
          { key: "onb_access_bank", label: "Bank feeds connected in QBO" },
          { key: "onb_access_cc", label: "Credit cards linked in QBO" },
          { key: "onb_access_payroll", label: "Payroll access granted (if applicable)" },
          { key: "onb_access_portal", label: "Google Drive / client portal access set up" },
        ],
      },
      {
        key: "onb_documents",
        label: "Collect Prior Financial Documents",
        category: "Access",
        hint: "Request: prior-year financials, open invoices, outstanding liabilities, and any existing Chart of Accounts.",
        blockedBy: ["onb_access"],
        subTasks: [
          { key: "onb_doc_financials", label: "Prior-year financials received" },
          { key: "onb_doc_invoices", label: "Open invoices received" },
          { key: "onb_doc_liabilities", label: "Outstanding liabilities documented" },
        ],
      },
      {
        key: "onb_coa",
        label: "Set Up & Standardize Chart of Accounts",
        category: "QBO Setup",
        hint: "Use standard trucking COA: Fuel, Maintenance, Insurance, Payroll, Revenue per Load, IFTA, Owner-Op Settlements.",
        qboLink: "https://app.qbo.intuit.com/app/chart-of-accounts",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/chart-of-accounts/set-up-your-chart-of-accounts-in-quickbooks-online/00/186177",
        blockedBy: ["onb_documents"],
        subTasks: [
          { key: "onb_coa_import", label: "Transactions imported from bank feeds" },
          { key: "onb_coa_review", label: "Chart of accounts reviewed and standardized" },
          { key: "onb_coa_fuel", label: "Fuel category set up" },
          { key: "onb_coa_maintenance", label: "Maintenance category set up" },
          { key: "onb_coa_payroll", label: "Payroll / driver pay category set up" },
          { key: "onb_coa_revenue", label: "Revenue per load category set up" },
        ],
      },
      {
        key: "onb_cleanup",
        label: "Complete Cleanup & Initial Reconciliation",
        category: "QBO Setup",
        hint: "Fix uncategorized transactions, reconcile prior periods (if needed), identify discrepancies. Output: clean baseline financials.",
        qboLink: "https://app.qbo.intuit.com/app/reconcile",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/statement-reconciliation/reconcile-account-quickbooks-online/L3XzsllsK_US_en_US",
        blockedBy: ["onb_coa"],
        subTasks: [
          { key: "onb_cleanup_uncategorized", label: "Uncategorized transactions resolved" },
          { key: "onb_cleanup_prior", label: "Prior periods reconciled (if applicable)" },
          { key: "onb_cleanup_discrepancies", label: "Discrepancies identified and documented" },
        ],
      },
      {
        key: "onb_ifta_setup",
        label: "Set Up IFTA Tracking",
        category: "Trucking-Specific",
        hint: "Create IFTA tracking sheet or log. Confirm truck unit numbers and states of operation.",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/reports/run-reports-in-quickbooks-online/00/186429",
        blockedBy: ["onb_coa"],
      },
      {
        key: "onb_payroll_setup",
        label: "Set Up Payroll (If Applicable)",
        category: "Trucking-Specific",
        hint: "Set up QBO payroll or sync existing payroll provider. Add all drivers and employees with correct pay rates.",
        qboLink: "https://app.qbo.intuit.com/app/payroll",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/employees/set-up-employees-in-quickbooks-online-payroll/00/369367",
        blockedBy: ["onb_access"],
        subTasks: [
          { key: "onb_payroll_employees", label: "All drivers/employees added to payroll" },
          { key: "onb_payroll_rates", label: "Pay rates and deductions configured" },
          { key: "onb_payroll_tax", label: "Payroll tax accounts set up (federal + CO state)" },
        ],
      },
      {
        key: "onb_first_reports",
        label: "Generate Baseline Financial Reports",
        category: "Delivery",
        hint: "Run P&L and Balance Sheet to establish a clean baseline. Send to client with a summary note.",
        qboLink: "https://app.qbo.intuit.com/app/reports",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/reports/run-reports-in-quickbooks-online/00/186429",
        blockedBy: ["onb_cleanup", "onb_ifta_setup"],
      },
      {
        key: "onb_checkin",
        label: "Complete Onboarding Check-In Call",
        category: "Delivery",
        hint: "Schedule a call to walk through the baseline reports, answer questions, and confirm the monthly workflow.",
        blockedBy: ["onb_first_reports"],
      },
    ],
  },
  {
    type: "ar_collections",
    label: "AR Collections",
    icon: "file-invoice-dollar",
    description: "Accounts receivable follow-up and collections workflow",
    tasks: [
      {
        key: "ar_pull_aging",
        label: "Pull AR Aging Report",
        category: "Review",
        hint: "Run AR aging in QBO. Sort by days outstanding: current, 1-30, 31-60, 61-90, 90+.",
        qboLink: "https://app.qbo.intuit.com/app/reports/detail?reportName=AgedReceivables",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/accounts-receivable-reports/run-accounts-receivable-aging-report/L4N7PC2hg_US_en_US",
        subTasks: [
          { key: "ar_aging_current", label: "Current invoices reviewed" },
          { key: "ar_aging_30", label: "1–30 day invoices reviewed" },
          { key: "ar_aging_60", label: "31–60 day invoices reviewed — follow-up needed" },
          { key: "ar_aging_90plus", label: "60+ day invoices flagged for escalation" },
        ],
      },
      {
        key: "ar_verify_invoices",
        label: "Verify All Loads Are Invoiced",
        category: "Review",
        hint: "Cross-check dispatch records or broker confirmations against QBO invoices. Missing invoices = missed revenue.",
        qboLink: "https://app.qbo.intuit.com/app/invoices",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/invoicing/create-invoices-quickbooks-online/L7gSzvCld_US_en_US",
        subTasks: [
          { key: "ar_verify_dispatch", label: "Dispatch records cross-checked" },
          { key: "ar_verify_missing", label: "Missing invoices created and sent" },
        ],
      },
      {
        key: "ar_factoring_match",
        label: "Match Factoring Advances to Invoices",
        category: "Factoring",
        hint: "Each factoring advance should link to one or more invoices. Unmatched advances will distort AR balance.",
        qboLink: "https://app.qbo.intuit.com/app/banking",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/banking/categorize-match-online-bank-transactions-online/L1bTafTz3_US_en_US",
        blockedBy: ["ar_pull_aging"],
        subTasks: [
          { key: "ar_factor_advances", label: "All factoring advances matched to invoices" },
          { key: "ar_factor_fees", label: "Factoring fees recorded as expense" },
          { key: "ar_factor_recourse", label: "Recourse / chargeback items flagged (if applicable)" },
        ],
      },
      {
        key: "ar_fuel_surcharge_check",
        label: "Verify Fuel Surcharge Amounts",
        category: "Factoring",
        hint: "Check fuel surcharge line items on broker remittances match what was invoiced. Short payments here are common.",
        qboLink: "https://app.qbo.intuit.com/app/invoices",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/invoicing/create-invoices-quickbooks-online/L7gSzvCld_US_en_US",
        blockedBy: ["ar_pull_aging"],
      },
      {
        key: "ar_followup_30",
        label: "Send Follow-Up on 30+ Day Invoices",
        category: "Collections",
        hint: "Email or call brokers/shippers with invoices 30+ days out. Keep a contact log.",
        qboLink: "https://app.qbo.intuit.com/app/invoices",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/invoicing/send-invoice-reminders-automatically-manually/L84cQjpxo_US_en_US",
        blockedBy: ["ar_pull_aging"],
        subTasks: [
          { key: "ar_followup_30_email", label: "Follow-up emails sent" },
          { key: "ar_followup_30_log", label: "Contact notes logged" },
        ],
      },
      {
        key: "ar_followup_60",
        label: "Escalate 60+ Day Invoices",
        category: "Collections",
        hint: "For 60+ day invoices: call directly, send demand letter, or refer to collections. Document all actions.",
        qboLink: "https://app.qbo.intuit.com/app/invoices",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/invoicing/send-invoice-reminders-automatically-manually/L84cQjpxo_US_en_US",
        blockedBy: ["ar_followup_30"],
        subTasks: [
          { key: "ar_esc_contact", label: "Direct phone contact attempted" },
          { key: "ar_esc_demand", label: "Demand letter sent (if warranted)" },
          { key: "ar_esc_documented", label: "Actions documented in QBO customer notes" },
        ],
      },
      {
        key: "ar_short_pays",
        label: "Identify & Resolve Short Payments",
        category: "Collections",
        hint: "Short pays often come from lumper deductions, fuel surcharge disputes, or late delivery deductions. Dispute or write off.",
        qboLink: "https://app.qbo.intuit.com/app/invoices",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/customer-refunds-credits/write-bad-debt-quickbooks-online/L88pSKtr9_US_en_US",
        blockedBy: ["ar_pull_aging"],
        subTasks: [
          { key: "ar_short_identify", label: "Short pay amounts identified" },
          { key: "ar_short_dispute", label: "Disputes filed with broker/shipper" },
          { key: "ar_short_writeoff", label: "Uncollectable short pays written off in QBO" },
        ],
      },
      {
        key: "ar_update_qbo",
        label: "Update QBO with All Payment Activity",
        category: "Bookkeeping",
        hint: "Apply all payments received. Match to correct invoices. Post any credit memos for disputes.",
        qboLink: "https://app.qbo.intuit.com/app/invoices",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/invoicing/record-invoice-payments-quickbooks-online/L4ZadDW7F_US_en_US",
        blockedBy: ["ar_factoring_match", "ar_short_pays"],
      },
      {
        key: "ar_cashflow_note",
        label: "Prepare AR Summary Note for Client",
        category: "Reporting",
        hint: "Summarize: total AR outstanding, invoices collected this period, problem accounts, expected cash inflows.",
        qboLink: "https://app.qbo.intuit.com/app/reports/detail?reportName=AgedReceivables",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/accounts-receivable-reports/run-accounts-receivable-aging-report/L4N7PC2hg_US_en_US",
        blockedBy: ["ar_update_qbo"],
      },
    ],
  },
  {
    type: "payment_reconciliation",
    label: "Payment Reconciliation",
    icon: "receipt",
    description: "Match pay statements and deposits to QBO records",
    tasks: [
      {
        key: "pmtrec_gather",
        label: "Gather All Pay Statements & Remittances",
        category: "Collection",
        hint: "Collect broker remittances, factoring statements, direct shipper payments, and owner-op settlements.",
        subTasks: [
          { key: "pmtrec_broker", label: "Broker remittances collected" },
          { key: "pmtrec_factoring", label: "Factoring statements collected" },
          { key: "pmtrec_direct", label: "Direct shipper payment advices collected" },
          { key: "pmtrec_oo", label: "Owner-op settlement statements collected" },
        ],
      },
      {
        key: "pmtrec_bank_deposits",
        label: "List All Bank Deposits for Period",
        category: "Collection",
        hint: "Pull bank statement. List each deposit by date, amount, and source. These are the deposits you need to match.",
        qboLink: "https://app.qbo.intuit.com/app/banking",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/banking/categorize-match-online-bank-transactions-online/L1bTafTz3_US_en_US",
        blockedBy: ["pmtrec_gather"],
      },
      {
        key: "pmtrec_match",
        label: "Match Statements to Deposits",
        category: "Matching",
        hint: "Each statement / remittance should correspond to a bank deposit. Use the Payment Reconciliation table below.",
        qboLink: "https://app.qbo.intuit.com/app/banking",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/banking/categorize-match-online-bank-transactions-online/L1bTafTz3_US_en_US",
        blockedBy: ["pmtrec_bank_deposits"],
        subTasks: [
          { key: "pmtrec_match_factoring", label: "Factoring advances matched to deposits" },
          { key: "pmtrec_match_direct", label: "Direct payments matched to deposits" },
          { key: "pmtrec_match_settlements", label: "Owner-op settlements matched" },
        ],
      },
      {
        key: "pmtrec_discrepancies",
        label: "Investigate Discrepancies",
        category: "Matching",
        hint: "Document any variance between expected and actual amounts. Common causes: factoring fees, chargeback holds, broker deductions.",
        blockedBy: ["pmtrec_match"],
        subTasks: [
          { key: "pmtrec_disc_identify", label: "All discrepancies identified and documented" },
          { key: "pmtrec_disc_resolve", label: "Discrepancies resolved or escalated" },
        ],
      },
      {
        key: "pmtrec_post_qbo",
        label: "Post All Payments in QBO",
        category: "Bookkeeping",
        hint: "Apply payments to correct invoices in QBO. For factoring: apply advance to invoice, record fees as expense.",
        qboLink: "https://app.qbo.intuit.com/app/invoices",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/invoicing/record-invoice-payments-quickbooks-online/L4ZadDW7F_US_en_US",
        blockedBy: ["pmtrec_discrepancies"],
        subTasks: [
          { key: "pmtrec_post_invoices", label: "Payments applied to correct invoices" },
          { key: "pmtrec_post_fees", label: "Factoring fees posted as expense" },
          { key: "pmtrec_post_holds", label: "Factoring holdbacks / reserves recorded" },
        ],
      },
      {
        key: "pmtrec_reconcile_ar",
        label: "Reconcile AR Balance After Posting",
        category: "Verification",
        hint: "After posting, pull AR aging again. Verify the balance reflects only truly outstanding invoices.",
        qboLink: "https://app.qbo.intuit.com/app/reports/detail?reportName=AgedReceivables",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/help-article/accounts-receivable-reports/run-accounts-receivable-aging-report/L4N7PC2hg_US_en_US",
        blockedBy: ["pmtrec_post_qbo"],
      },
      {
        key: "pmtrec_summary",
        label: "Prepare Reconciliation Summary",
        category: "Reporting",
        hint: "Document: total expected, total received, total variance, unresolved items. Attach to client file.",
        qboLink: "https://app.qbo.intuit.com/app/reports",
        qboHelpLink: "https://quickbooks.intuit.com/learn-support/en-us/reports/share-and-export-reports-in-quickbooks-online/00/186430",
        blockedBy: ["pmtrec_reconcile_ar"],
      },
    ],
  },
];

export function getWorkflow(type: string): Workflow | undefined {
  return WORKFLOWS.find((w) => w.type === type);
}

// Filter tasks based on client service level tier
export function getFilteredTasks(wf: Workflow, serviceLevel: string): WorkflowTask[] {
  return wf.tasks.filter(t => !t.tiers || t.tiers.includes(serviceLevel as any));
}

export function getTaskCompletionStatus(
  tasks: WorkflowTask[],
  instances: Map<string, TaskStatus>
): { total: number; complete: number; percent: number } {
  const total = tasks.length;
  let complete = 0;
  for (const task of tasks) {
    const status = instances.get(task.key);
    if (status === "complete" || status === "skipped") complete++;
  }
  return { total, complete, percent: total === 0 ? 0 : Math.round((complete / total) * 100) };
}

export function isTaskBlocked(
  task: WorkflowTask,
  instances: Map<string, TaskStatus>
): boolean {
  if (!task.blockedBy || task.blockedBy.length === 0) return false;
  return task.blockedBy.some((key) => {
    const s = instances.get(key);
    return s !== "complete" && s !== "skipped";
  });
}

export function areAllSubtasksComplete(
  task: WorkflowTask,
  instances: Map<string, TaskStatus>
): boolean {
  if (!task.subTasks || task.subTasks.length === 0) return true;
  return task.subTasks.every((sub) => {
    const s = instances.get(sub.key);
    return s === "complete" || s === "skipped";
  });
}
