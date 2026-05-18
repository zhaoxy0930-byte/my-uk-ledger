const STORAGE_KEY = "ledger-uk-state-v1";
const PDFJS_URL = "./vendor-pdf.mjs";
const PDFJS_WORKER_URL = "./vendor-pdf.worker.mjs";
const TESSERACT_URL = "./vendor-tesseract.min.js";
const TESSERACT_WORKER_URL = "./vendor-tesseract.worker.min.js";
const TESSERACT_CORE_URL = "./vendor-tesseract-core.wasm.js";
const SUPABASE_URL = "https://dospbwtpfumyxehmoqpm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_aYdm45GrTWi-p5C3fPscyA_Sor_X8jg";

const defaultCategories = [
  "Salary Income",
  "Other Income",
  "Refunds / Reimbursements",
  "Rent / Mortgage",
  "Council Tax",
  "Utilities",
  "Groceries",
  "Eating Out",
  "Takeaway / Delivery",
  "Sports",
  "Entertainment",
  "Transport",
  "Subscriptions",
  "Shopping",
  "Healthcare",
  "Savings / Investment",
  "Transfer",
  "Travel",
  "Cash",
  "Uncategorised"
];

const defaultRules = [
  ["salary", "Salary Income"],
  ["payroll", "Salary Income"],
  ["hmrc", "Salary Income"],
  ["refund", "Refunds / Reimbursements"],
  ["cashback", "Refunds / Reimbursements"],
  ["reimbursement", "Refunds / Reimbursements"],
  ["tesco", "Groceries"],
  ["asda", "Groceries"],
  ["sainsbury", "Groceries"],
  ["waitrose", "Groceries"],
  ["aldi", "Groceries"],
  ["lidl", "Groceries"],
  ["morrisons", "Groceries"],
  ["uber eats", "Takeaway / Delivery"],
  ["deliveroo", "Takeaway / Delivery"],
  ["hungrypanda", "Takeaway / Delivery"],
  ["eatclub", "Takeaway / Delivery"],
  ["tiktok shop", "Shopping"],
  ["global-e", "Shopping"],
  ["alo", "Shopping"],
  ["pret", "Eating Out"],
  ["costa", "Eating Out"],
  ["tennis", "Sports"],
  ["tfl", "Transport"],
  ["trainline", "Transport"],
  ["national rail", "Transport"],
  ["council tax", "Council Tax"],
  ["thames water", "Utilities"],
  ["octopus", "Utilities"],
  ["bulb", "Utilities"],
  ["ee limited", "Utilities"],
  ["vodafone", "Utilities"],
  ["netflix", "Subscriptions"],
  ["spotify", "Subscriptions"],
  ["amazon prime", "Subscriptions"],
  ["rent", "Rent / Mortgage"],
  ["mortgage", "Rent / Mortgage"],
  ["vanguard", "Savings / Investment"],
  ["trading 212", "Savings / Investment"],
  ["revolut", "Transfer"],
  ["monzo", "Transfer"]
].map(([keyword, category]) => ({ id: crypto.randomUUID(), keyword, category, source: "default" }));

let state = loadState();
let currentView = "dashboard";
let analysisGrain = "day";
let periodAnchor = new Date();
let transactionPage = 1;
let pendingImport = null;
let activeMacroFilter = null;
let privacyMode = false;
let language = localStorage.getItem("ledger-uk-language") || "en";
let rulesPage = 1;
const RULES_PER_PAGE = 20;
let supabaseClient = null;
let currentUser = null;
let cloudSaveTimer = null;
let applyingCloudState = false;
let sheetTransactionId = null;
let transactionReturnView = null;
let lastScrollY = 0;
const chartState = new WeakMap();

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  hydrateControls();
  bindEvents();
  render();
  initCloudSync();
});

window.addEventListener("resize", debounce(() => render(), 160));
window.addEventListener("scroll", () => {
  if (!isMobileLayout()) return;
  const y = window.scrollY || 0;
  document.body.classList.toggle("mobile-nav-hidden", y > lastScrollY && y > 120);
  lastScrollY = y;
}, { passive: true });

function cacheElements() {
  [
    "pageTitle", "periodSelect", "mobilePeriodSelect", "prevPeriodButton", "currentPeriodButton", "nextPeriodButton", "privacyToggleButton", "languageSelect", "mobileLanguageSelect", "authOpenButton", "mobileAuthOpenButton", "authModal", "authCloseButton", "authDialogEyebrow", "authDialogTitle", "authDialogCopy", "authForm", "authEmail", "authPassword", "signInButton", "signUpButton", "signOutButton", "authStatus", "authMessage", "seedButton", "mobileSeedButton", "resetButton", "mobileResetButton", "saveIndicator", "incomeMetric", "expenseMetric",
    "netMetric", "reviewMetric", "incomeDelta", "expenseDelta", "netDelta", "cashflowChart", "trendLabel",
    "cashflowTooltip", "periodRangeLabel", "periodCompareLabel", "periodBreakdown", "weeklyBreakdown",
    "analysisChart", "analysisTooltip", "analysisIncomeMetric", "analysisExpenseMetric", "analysisPeakMetric",
    "analysisAverageMetric", "analysisIncomeDelta", "analysisExpenseDelta", "analysisPeakLabel", "analysisAverageLabel",
    "categoryBars", "categoryTotal", "insights", "recentTransactions", "viewTopExpensesButton",
    "dropzone", "fileInput", "chooseFileButton", "importSummary", "importPreview",
    "mobileTransactionsBackButton", "transactionFilterButton", "transactionFilterCloseButton", "transactionFilterBackdrop", "searchInput", "categoryFilter", "typeFilter", "transactionSortSelect", "transactionStartDate", "transactionEndDate",
    "usePeriodDateFilterButton", "clearDateFilterButton", "findDuplicatesButton", "pageSizeSelect", "transactionCountLabel",
    "prevPageButton", "nextPageButton", "pageLabel", "transactionTable", "mobileTransactionList", "transactionSheet", "sheetCloseButton", "sheetMerchant", "sheetMeta", "sheetOrb", "sheetDate", "sheetAmount", "sheetMerchantInput", "sheetDescription", "sheetCategory", "sheetRefundButton", "sheetDeleteButton", "sheetSaveButton", "merchantRanking",
    "budgetPressure", "macroPieChart", "macroCategoryBars", "macroCategoryTotal", "analysisTitle", "analysisRange", "incomeRecurring", "expenseRecurring",
    "recurringTimeline", "ruleForm", "ruleKeyword", "ruleCategory", "rulesList", "ruleCount",
    "categoryForm", "categoryName", "customCategoriesList"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function hydrateControls() {
  if (els.languageSelect) els.languageSelect.value = language;
  if (els.mobileLanguageSelect) els.mobileLanguageSelect.value = language;
  if (els.mobilePeriodSelect && els.periodSelect) els.mobilePeriodSelect.value = els.periodSelect.value;
  document.querySelectorAll("[data-grain]").forEach((item) => {
    item.classList.toggle("active", item.dataset.grain === analysisGrain);
  });
  fillCategorySelect(els.categoryFilter, true);
  fillCategorySelect(els.ruleCategory, false);
  applyLanguageStatic();
}

function setLanguage(nextLanguage) {
  language = nextLanguage;
  localStorage.setItem("ledger-uk-language", language);
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en-GB";
  applyLanguageStatic();
  hydrateControls();
  render();
}

function setPeriodMode(period) {
  if (!period) return;
  if (els.periodSelect) els.periodSelect.value = period;
  if (els.mobilePeriodSelect) els.mobilePeriodSelect.value = period;
  analysisGrain = period;
  document.querySelectorAll("[data-grain]").forEach((item) => {
    item.classList.toggle("active", item.dataset.grain === period);
  });
  transactionPage = 1;
  updateCurrentPeriodButton();
  render();
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.view === "transactions") transactionReturnView = null;
      setView(button.dataset.view);
    });
  });

  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.jump));
  });

  els.viewTopExpensesButton.addEventListener("click", () => openDashboardTransactions("expense"));

  document.querySelectorAll("[data-dashboard-drilldown]").forEach((button) => {
    button.addEventListener("click", () => openDashboardTransactions(button.dataset.dashboardDrilldown));
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDashboardTransactions(button.dataset.dashboardDrilldown);
      }
    });
  });

  els.periodSelect.addEventListener("change", () => setPeriodMode(els.periodSelect.value));
  els.prevPeriodButton.addEventListener("click", () => shiftPeriod(-1));
  els.currentPeriodButton.addEventListener("click", () => {
    periodAnchor = new Date();
    render();
  });
  els.nextPeriodButton.addEventListener("click", () => shiftPeriod(1));
  if (els.languageSelect) {
    els.languageSelect.addEventListener("change", () => {
      setLanguage(els.languageSelect.value);
    });
  }
  if (els.mobileLanguageSelect) {
    els.mobileLanguageSelect.addEventListener("change", () => {
      setLanguage(els.mobileLanguageSelect.value);
    });
  }
  if (els.mobilePeriodSelect && els.periodSelect) {
    els.mobilePeriodSelect.addEventListener("change", () => setPeriodMode(els.mobilePeriodSelect.value));
  }
  if (els.authForm) {
    els.authForm.addEventListener("submit", (event) => {
      event.preventDefault();
      signInWithEmail();
    });
  }
  if (els.authOpenButton) els.authOpenButton.addEventListener("click", () => openAuthModal());
  if (els.mobileAuthOpenButton) els.mobileAuthOpenButton.addEventListener("click", () => openAuthModal());
  if (els.authCloseButton) els.authCloseButton.addEventListener("click", () => closeAuthModal());
  if (els.authModal) {
    els.authModal.addEventListener("click", (event) => {
      if (event.target === els.authModal) closeAuthModal();
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.authModal && !els.authModal.classList.contains("hidden")) closeAuthModal();
  });
  if (els.signUpButton) els.signUpButton.addEventListener("click", () => signUpWithEmail());
  if (els.signOutButton) els.signOutButton.addEventListener("click", () => signOutCloud());
  if (els.sheetCloseButton) els.sheetCloseButton.addEventListener("click", () => closeTransactionSheet());
  if (els.transactionSheet) {
    els.transactionSheet.addEventListener("click", (event) => {
      if (event.target === els.transactionSheet) closeTransactionSheet();
    });
  }
  if (els.sheetSaveButton) els.sheetSaveButton.addEventListener("click", () => saveTransactionSheet());
  if (els.sheetRefundButton) els.sheetRefundButton.addEventListener("click", () => {
    if (sheetTransactionId) markTransactionAsRefund(sheetTransactionId);
    closeTransactionSheet();
  });
  if (els.sheetDeleteButton) els.sheetDeleteButton.addEventListener("click", () => {
    if (sheetTransactionId) deleteTransaction(sheetTransactionId);
    closeTransactionSheet();
  });
  if (els.privacyToggleButton) {
    els.privacyToggleButton.addEventListener("click", () => {
      privacyMode = !privacyMode;
      document.body.classList.toggle("privacy-mode", privacyMode);
      els.privacyToggleButton.setAttribute("aria-pressed", String(privacyMode));
      els.privacyToggleButton.textContent = privacyMode ? "◍" : "◌";
    });
  }
  els.seedButton.addEventListener("click", loadDemoData);
  els.resetButton.addEventListener("click", resetData);
  if (els.mobileSeedButton) els.mobileSeedButton.addEventListener("click", loadDemoData);
  if (els.mobileResetButton) els.mobileResetButton.addEventListener("click", resetData);
  if (els.transactionFilterButton) els.transactionFilterButton.addEventListener("click", () => openTransactionFilters());
  if (els.transactionFilterCloseButton) els.transactionFilterCloseButton.addEventListener("click", () => closeTransactionFilters());
  if (els.transactionFilterBackdrop) els.transactionFilterBackdrop.addEventListener("click", () => closeTransactionFilters());
  if (els.mobileTransactionsBackButton) els.mobileTransactionsBackButton.addEventListener("click", () => returnFromTransactionDrilldown());
  els.searchInput.addEventListener("input", () => clearMacroAndRenderTransactions());
  els.categoryFilter.addEventListener("change", () => clearMacroAndRenderTransactions());
  els.typeFilter.addEventListener("change", () => clearMacroAndRenderTransactions());
  els.transactionSortSelect.addEventListener("change", () => resetTransactionPageAndRender());
  els.transactionStartDate.addEventListener("change", () => clearMacroAndRenderTransactions());
  els.transactionEndDate.addEventListener("change", () => clearMacroAndRenderTransactions());
  els.usePeriodDateFilterButton.addEventListener("click", () => applyCurrentPeriodDateFilter());
  els.clearDateFilterButton.addEventListener("click", () => clearTransactionDateFilter());
  els.findDuplicatesButton.addEventListener("click", () => showDuplicateTransactions());
  els.pageSizeSelect.addEventListener("change", () => resetTransactionPageAndRender());
  els.prevPageButton.addEventListener("click", () => {
    transactionPage = Math.max(1, transactionPage - 1);
    renderTransactions();
  });
  els.nextPageButton.addEventListener("click", () => {
    transactionPage += 1;
    renderTransactions();
  });

  document.querySelectorAll("[data-grain]").forEach((button) => {
    button.addEventListener("click", () => {
      setPeriodMode(button.dataset.grain);
    });
  });

  els.chooseFileButton.addEventListener("click", (event) => {
    event.preventDefault();
    els.fileInput.click();
  });
  els.fileInput.addEventListener("change", (event) => importFiles([...event.target.files]));

  ["dragenter", "dragover"].forEach((name) => {
    els.dropzone.addEventListener(name, (event) => {
      event.preventDefault();
      els.dropzone.classList.add("dragging");
    });
  });
  ["dragleave", "drop"].forEach((name) => {
    els.dropzone.addEventListener(name, (event) => {
      event.preventDefault();
      els.dropzone.classList.remove("dragging");
    });
  });
  els.dropzone.addEventListener("drop", (event) => importFiles([...event.dataTransfer.files]));

  els.ruleForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const keyword = els.ruleKeyword.value.trim();
    const category = els.ruleCategory.value;
    if (!keyword) return;
    state.rules.unshift({ id: crypto.randomUUID(), keyword, category, source: "manual" });
    els.ruleKeyword.value = "";
    persist();
    render();
  });

  els.categoryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = els.categoryName.value.trim();
    if (!name) return;
    const exists = getCategories().some((category) => category.toLowerCase() === name.toLowerCase());
    if (!exists) {
      state.categories.push(name);
      hydrateControls();
      persist();
      render();
    }
    els.categoryName.value = "";
  });

  bindChartTooltip(els.cashflowChart, els.cashflowTooltip);
  bindChartTooltip(els.analysisChart, els.analysisTooltip);
  updateCurrentPeriodButton();
}

const copy = {
  en: {
    nav: ["Overview", "Import", "Transactions", "Analytics", "Recurring", "Rules"],
    pageTitles: { dashboard: "Overview", import: "Import", transactions: "Transactions", analytics: "Analytics", recurring: "Recurring", rules: "Rules" },
    eyebrow: "UK bank statement analytics",
    localFirstTitle: "Local first",
    localFirstText: "This prototype keeps bank data on this device. Transactions are saved in your browser.",
    autoSave: "Auto save",
    saved: "Saved",
    period: "Period",
    periodOptions: { month: "Month", week: "Week", day: "Day", year: "Year" },
    previousPeriod: "Previous period",
    nextPeriod: "Next period",
    currentPeriod: "Current period",
    thisMonth: "This month",
    demoData: "Demo data",
    clear: "Clear",
    income: "Income",
    expense: "Expense",
    netCashflow: "Net cashflow",
    waiting: "Waiting for data",
    incomeMinusExpense: "Income minus expense",
    needsReview: "Needs review",
    lowConfidence: "Low-confidence categories",
    cashflowTrend: "Cashflow trend",
    byMonth: "By month",
    expenseCategories: "Expense categories",
    insights: "Insights",
    autoGenerated: "Auto generated",
    topExpenses: "Top expenses",
    viewAll: "View all",
    uploadTitle: "Upload bank statements or screenshots",
    uploadCopy: "Supports CSV, TXT, text-based bank PDFs, and OCR for JPG, PNG, WebP screenshots. You can select or drop multiple files at once.",
    chooseFiles: "Choose files",
    builtInRecognition: "Built-in recognition",
    csvPdfScreenshots: "CSV/PDF/screenshots",
    recognitionCopy: "Automatically looks for Date, Description, Merchant, Amount, Money In, Money Out, Balance, and common PDF statement rows.",
    importResults: "Import results",
    noImports: "No imports yet",
    searchPlaceholder: "Search merchant, note, bank account",
    all: "All",
    needsAction: "Needs action",
    uncategorised: "Uncategorised",
    refunds: "Refunds",
    duplicates: "Potential duplicates",
    newest: "Newest date",
    oldest: "Oldest date",
    amountHigh: "Amount high to low",
    amountLow: "Amount low to high",
    merchantAZ: "Merchant A-Z",
    to: "to",
    usePeriod: "Current period",
    clearDates: "Clear dates",
    findDuplicates: "Find duplicates",
    perPage: (n) => `${n} per page`,
    previous: "Previous",
    next: "Next",
    tableHeads: ["Date", "Merchant / Description", "Bank", "Category", "Amount", "Status", "Actions"],
    grains: { day: "Day", week: "Week", month: "Month", year: "Year" },
    analysedIncome: "Analysed income",
    analysedExpense: "Analysed expense",
    peakSpendPeriod: "Peak spend period",
    averageSpend: "Average spend",
    noComparison: "No comparison",
    byCurrentGrain: "By current grain",
    merchantRanking: "Merchant ranking",
    budgetPressure: "Budget pressure",
    byCategory: "By category",
    macroCategories: "Macro categories",
    recurringIncome: "Recurring income",
    salaryEtc: "Salary etc.",
    recurringExpenses: "Recurring expenses",
    billsSubscriptions: "Bills/subscriptions",
    recurringItems: "Recurring items this period",
    withinRange: "Within current range",
    autoRules: "Auto-categorisation rules",
    keywordPlaceholder: "Keyword, e.g. TESCO",
    add: "Add",
    categoryLearning: "Category learning",
    categoryLearningCopy: "When you manually change a category in the transaction table, the app remembers the merchant keyword and uses your choice next time.",
    categoryPlaceholder: "New category, e.g. Sports",
    addCategory: "Add category",
    emptyTitle: "No data yet",
    emptyText: "Import a bank statement, or load demo data first.",
    emailPlaceholder: "Email",
    passwordPlaceholder: "Password",
    signIn: "Sign in",
    signUp: "Sign up",
    signOut: "Sign out",
    cloudSync: "Cloud sync",
    account: "Account",
    signInShort: "Sign in",
    authTitle: "Sign in to Ledger UK",
    authCopy: "Save your ledger to Supabase so it can follow you across devices.",
    close: "Close",
    cloudOff: "Cloud off",
    cloudReady: "Cloud ready",
    cloudSaving: "Saving cloud...",
    cloudSaved: "Cloud saved",
    cloudLoading: "Loading cloud...",
    cloudUnavailable: "Cloud unavailable",
    cloudTimeout: "Cloud sync timed out. Check Supabase URL, key, or table policies.",
    enterEmailPassword: "Enter email and password first.",
    checkEmail: "Check your email to confirm sign up, then sign in.",
    signedOut: "Signed out",
    previousComparison: "No previous comparison",
    cashflowPositive: "Cashflow positive",
    cashflowNegative: "Cashflow negative",
    by: "by",
    pointCount: (n, grain) => `${n} ${grain} points`,
    periodIncome: (period) => `${period} income`,
    periodExpense: (period) => `${period} expense`,
    transactionCount: "Transaction count",
    previousItems: (n) => `Previous period ${n} items`,
    topMerchant: "Top merchant",
    none: "None",
    noSpending: "No spending",
    weeklyBreakdown: "Weekly breakdown",
    weeklyLegend: "Income / expense / net / count",
    items: (n) => `${n} items`,
    topCategoryInsight: (category, amount) => `Top expense category is ${category}, total ${amount}.`,
    noExpenses: "No expenses in this period.",
    recurringInsight: (count, amount) => `Detected ${count} subscription or recurring transactions, total ${amount}.`,
    noSubscriptions: "No subscription spending detected this period.",
    savingsInsight: (rate) => `Savings rate this period is about ${rate}%.`,
    importSalary: "Import salary to calculate disposable income and savings rate.",
    showingRows: (start, end, total) => `Showing ${start}-${end} / ${total} items`,
    zeroTransactions: "0 transactions",
    page: (page, total) => `Page ${page} / ${total}`,
    analysisNames: { day: "Daily view", week: "Weekly view", month: "Monthly view", year: "Yearly view" },
    peakSpend: (grain, label) => `Peak spend ${grain}: ${label}`,
    averageBy: (grain) => `Average by ${grain}`,
    rulesCount: (n) => `${n} rules`,
    delete: "Delete",
    noCustomCategories: "No custom categories yet",
    categoryInUse: "This category is used by transactions or rules. Move those first, then delete it.",
    foundImport: (total, selected, duplicates) => `Found ${total} transactions, ${selected} ready to import, ${duplicates} duplicates`,
    unsupportedFile: "Unsupported file type",
    reviewBeforeImport: "Review before import",
    duplicateHelp: "Duplicates are skipped by default. Editing candidates will re-check duplicates.",
    selectAllImportable: "Select all importable",
    clearAll: "Clear all",
    cancelBatch: "Cancel batch",
    confirmImport: (n) => `Confirm import ${n} items`,
    importColumn: "Import",
    ready: "Ready",
    importBatchCancelled: "Import batch cancelled",
    noTransactionsSelected: "No transactions selected for import.",
    manualReviewedImport: "Manual reviewed import",
    importDone: (added, skipped) => `Imported ${added}; skipped ${skipped} duplicates`,
    noImportRows: "No importable transaction rows found",
    importFile: "Import file",
    ocrPreview: "OCR preview",
    uploadVisibleTable: "Upload the transaction detail page, or crop the PDF/screenshot so the transaction table is visible",
    thisImportAdded: (n) => `This import added ${n} transactions`,
    undoImportHelp: "If recognition looks wrong, undo this import and upload again.",
    undoThisImport: "Undo this import",
    noTransactionsForImport: "No transactions found for this import. It may already have been undone.",
    deleteImportConfirm: (n) => `Delete the ${n} transactions from this import?`,
    importUndone: (n) => `Undid ${n} imported transactions`,
    deleteTransactionConfirm: "Delete this transaction?",
    allCategories: "All categories",
    review: "Review",
    categorised: "Categorised",
    confirm: "Confirm",
    refund: "Refund",
    markAsRefund: "Mark as refund",
    confirmTransaction: "Confirm this transaction",
    deleteTransaction: "Delete this transaction",
    chartEmpty: "Import statements to show trends",
    noData: "No data",
    unknown: "Unknown",
    macroLabels: {
      "Food": "Food",
      "Shopping / Essentials": "Shopping / Essentials",
      "Groceries": "Groceries",
      "Leisure / Travel": "Leisure / Travel",
      "Fixed bills": "Fixed bills",
      "Transfers / Investments": "Transfers / Investments",
      "Income / Refunds": "Income / Refunds",
      "Other": "Other"
    },
    categoryLabels: {
      "水电煤网": "Utilities",
      "房租 / Mortgage": "Rent / Mortgage",
      "购物 / 日用品": "Shopping / Daily essentials",
      "吃": "Food",
      "玩 / 出行": "Leisure / Travel",
      "固定账单": "Fixed bills"
    }
  },
  zh: {
    nav: ["总览", "导入", "交易", "分析", "固定项", "规则"],
    pageTitles: { dashboard: "总览", import: "导入", transactions: "交易", analytics: "分析", recurring: "固定项", rules: "规则" },
    eyebrow: "英国银行账单分析",
    localFirstTitle: "本地优先",
    localFirstText: "当前版本不会上传银行数据，交易保存在你的浏览器本地。",
    autoSave: "自动保存",
    saved: "已保存",
    period: "周期",
    periodOptions: { month: "月", week: "周", day: "日", year: "年" },
    previousPeriod: "上一周期",
    nextPeriod: "下一周期",
    currentPeriod: "当前周期",
    thisMonth: "本月",
    demoData: "示例数据",
    clear: "清空",
    income: "收入",
    expense: "支出",
    netCashflow: "净现金流",
    waiting: "等待数据",
    incomeMinusExpense: "收入减支出",
    needsReview: "待确认",
    lowConfidence: "低置信度分类",
    cashflowTrend: "现金流趋势",
    byMonth: "按月",
    expenseCategories: "支出类目",
    insights: "本月洞察",
    autoGenerated: "自动生成",
    topExpenses: "大额支出排行",
    viewAll: "查看全部",
    uploadTitle: "上传银行月账单或截图",
    uploadCopy: "支持 CSV、TXT、文字型银行 PDF，也可 OCR 识别 JPG、PNG、WebP 截图。可一次选择或拖入多个文件。",
    chooseFiles: "选择文件",
    builtInRecognition: "已内置识别",
    csvPdfScreenshots: "CSV/PDF/截图",
    recognitionCopy: "会自动寻找 Date、Description、Merchant、Amount、Money In、Money Out、Balance 等字段，并解析常见 PDF statement 行。",
    importResults: "导入结果",
    noImports: "尚未导入",
    searchPlaceholder: "搜索商户、备注、银行账户",
    all: "全部",
    needsAction: "待处理",
    uncategorised: "未分类",
    refunds: "退款",
    duplicates: "疑似重复",
    newest: "日期最新",
    oldest: "日期最早",
    amountHigh: "金额从高到低",
    amountLow: "金额从低到高",
    merchantAZ: "商户 A-Z",
    to: "至",
    usePeriod: "当前周期",
    clearDates: "清除日期",
    findDuplicates: "查重复",
    perPage: (n) => `每页 ${n}`,
    previous: "上一页",
    next: "下一页",
    tableHeads: ["日期", "商户 / 描述", "银行", "类目", "金额", "状态", "操作"],
    grains: { day: "日", week: "周", month: "月", year: "年" },
    analysedIncome: "分析收入",
    analysedExpense: "分析支出",
    peakSpendPeriod: "最高支出周期",
    averageSpend: "平均每期支出",
    noComparison: "暂无对比",
    byCurrentGrain: "按当前维度",
    merchantRanking: "商户排行",
    budgetPressure: "预算压力",
    byCategory: "按类目",
    macroCategories: "大类统计",
    recurringIncome: "固定收入",
    salaryEtc: "工资等",
    recurringExpenses: "固定支出",
    billsSubscriptions: "账单/订阅",
    recurringItems: "当前周期重复项目",
    withinRange: "按当前筛选范围",
    autoRules: "自动分类规则",
    keywordPlaceholder: "关键词，例如 TESCO",
    add: "新增",
    categoryLearning: "分类学习",
    categoryLearningCopy: "你在交易表里手动改类目后，系统会记住商户关键词。下一次导入相似交易，会优先使用你的选择。",
    categoryPlaceholder: "新增类目，例如 Sports",
    addCategory: "新增类目",
    emptyTitle: "还没有数据",
    emptyText: "导入银行账单，或先加载示例数据看效果。",
    emailPlaceholder: "邮箱",
    passwordPlaceholder: "密码",
    signIn: "登录",
    signUp: "注册",
    signOut: "退出",
    cloudSync: "云端同步",
    account: "账户",
    signInShort: "登录",
    authTitle: "登录 Ledger UK",
    authCopy: "把账本保存到 Supabase，这样换电脑也能继续使用。",
    close: "关闭",
    cloudOff: "云端未登录",
    cloudReady: "云端已连接",
    cloudSaving: "正在保存云端...",
    cloudSaved: "云端已保存",
    cloudLoading: "正在读取云端...",
    cloudUnavailable: "云端不可用",
    cloudTimeout: "云端同步超时，请检查 Supabase URL、key 或表权限。",
    enterEmailPassword: "请先输入邮箱和密码。",
    checkEmail: "请去邮箱确认注册，然后再登录。",
    signedOut: "已退出登录",
    previousComparison: "暂无上期对比",
    cashflowPositive: "现金流为正",
    cashflowNegative: "现金流为负",
    by: "按",
    pointCount: (n, grain) => `${n} 个${grain}节点`,
    periodIncome: (period) => `${period}收入`,
    periodExpense: (period) => `${period}支出`,
    transactionCount: "交易笔数",
    previousItems: (n) => `上一周期 ${n} 笔`,
    topMerchant: "最大商户",
    none: "无",
    noSpending: "无支出",
    weeklyBreakdown: "每周明细",
    weeklyLegend: "收入 / 支出 / 净额 / 笔数",
    items: (n) => `${n} 笔`,
    topCategoryInsight: (category, amount) => `最大支出类目是 ${category}，合计 ${amount}。`,
    noExpenses: "本周期没有支出。",
    recurringInsight: (count, amount) => `识别到 ${count} 笔订阅或固定项，合计 ${amount}。`,
    noSubscriptions: "当前周期暂未识别到订阅支出。",
    savingsInsight: (rate) => `当前周期储蓄率约 ${rate}%。`,
    importSalary: "导入工资后可计算可支配收入和储蓄率。",
    showingRows: (start, end, total) => `显示 ${start}-${end} / 共 ${total} 笔`,
    zeroTransactions: "0 笔交易",
    page: (page, total) => `第 ${page} / ${total} 页`,
    analysisNames: { day: "按日分析", week: "按周分析", month: "按月分析", year: "按年分析" },
    peakSpend: (grain, label) => `最高支出${grain}：${label}`,
    averageBy: (grain) => `按${grain}平均`,
    rulesCount: (n) => `${n} 条规则`,
    delete: "删除",
    noCustomCategories: "还没有自定义类目",
    categoryInUse: "这个类目正在被交易或规则使用。请先移动相关项目，再删除。",
    foundImport: (total, selected, duplicates) => `识别到 ${total} 笔，待导入 ${selected} 笔，重复 ${duplicates} 笔`,
    unsupportedFile: "不支持的文件类型",
    reviewBeforeImport: "导入前检查",
    duplicateHelp: "重复项默认跳过。编辑待导入项目后会重新检查重复。",
    selectAllImportable: "全选可导入",
    clearAll: "清空选择",
    cancelBatch: "取消本批次",
    confirmImport: (n) => `确认导入 ${n} 笔`,
    importColumn: "导入",
    ready: "可导入",
    importBatchCancelled: "已取消本次导入",
    noTransactionsSelected: "没有选择要导入的交易。",
    manualReviewedImport: "手动确认导入",
    importDone: (added, skipped) => `已导入 ${added} 笔，跳过重复 ${skipped} 笔`,
    noImportRows: "没有找到可导入的交易行",
    importFile: "导入文件",
    ocrPreview: "OCR识别片段",
    uploadVisibleTable: "请上传交易明细页，或把 PDF/截图裁到能看到交易表格",
    thisImportAdded: (n) => `本次导入新增 ${n} 笔交易`,
    undoImportHelp: "如果识别结果不对，可以撤销本次导入后重新上传。",
    undoThisImport: "撤销本次导入",
    noTransactionsForImport: "没有找到本次导入的交易，可能已经撤销。",
    deleteImportConfirm: (n) => `删除本次导入的 ${n} 笔交易？`,
    importUndone: (n) => `已撤销 ${n} 笔导入交易`,
    deleteTransactionConfirm: "删除这笔交易？",
    allCategories: "全部类目",
    review: "待确认",
    categorised: "已分类",
    confirm: "确认",
    refund: "退款",
    markAsRefund: "标记为退款",
    confirmTransaction: "确认这笔交易",
    deleteTransaction: "删除这笔交易",
    chartEmpty: "导入账单后显示趋势",
    noData: "暂无数据",
    unknown: "未知",
    macroLabels: {},
    categoryLabels: {}
  }
};

function tr(key) {
  return key.split(".").reduce((value, part) => value?.[part], copy[language]) ?? key;
}

function labelText(group, label) {
  return tr(group)?.[label] || label;
}

function applyLanguageStatic() {
  const dict = copy[language];
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en-GB";
  document.querySelectorAll(".nav-item span:last-child").forEach((item, index) => {
    item.textContent = dict.nav[index] || item.textContent;
  });
  document.querySelector(".eyebrow").textContent = dict.eyebrow;
  document.querySelector(".privacy-note strong").textContent = dict.localFirstTitle;
  document.querySelector(".privacy-note span").textContent = dict.localFirstText;
  document.querySelector(".select-label span").textContent = dict.period;
  [...els.periodSelect.options].forEach((option) => {
    option.textContent = dict.periodOptions[option.value];
  });
  els.prevPeriodButton.title = dict.previousPeriod;
  els.nextPeriodButton.title = dict.nextPeriod;
  els.currentPeriodButton.title = language === "zh" ? "回到当前周期" : "Back to current period";
  els.seedButton.textContent = dict.demoData;
  els.resetButton.textContent = dict.clear;
  if (els.authEmail) els.authEmail.placeholder = dict.emailPlaceholder;
  if (els.authPassword) els.authPassword.placeholder = dict.passwordPlaceholder;
  if (els.signInButton) els.signInButton.textContent = dict.signIn;
  if (els.signUpButton) els.signUpButton.textContent = dict.signUp;
  if (els.signOutButton) els.signOutButton.textContent = dict.signOut;
  if (els.authDialogEyebrow) els.authDialogEyebrow.textContent = dict.cloudSync;
  if (els.authDialogTitle) els.authDialogTitle.textContent = dict.authTitle;
  if (els.authDialogCopy) els.authDialogCopy.textContent = dict.authCopy;
  if (els.authCloseButton) els.authCloseButton.title = dict.close;
  if (els.authStatus && !currentUser) els.authStatus.textContent = dict.cloudOff;
  document.querySelector(".legend-income").parentElement.lastChild.textContent = dict.income;
  document.querySelector(".legend-expense").parentElement.lastChild.textContent = dict.expense;
  document.querySelector(".legend-net").parentElement.lastChild.textContent = dict.netCashflow;
  setText("#dashboardView .metric:nth-child(1) span", dict.income);
  setText("#dashboardView .metric:nth-child(2) span", dict.expense);
  setText("#dashboardView .metric:nth-child(3) span", dict.netCashflow);
  setText("#dashboardView .metric:nth-child(4) span", dict.needsReview);
  setText("#dashboardView .metric:nth-child(4) small", dict.lowConfidence);
  setText("#dashboardView .panel:nth-child(1) h2", dict.cashflowTrend);
  setText("#dashboardView .panel:nth-child(2) h2", dict.expenseCategories);
  setText("#dashboardView .panel:nth-child(3) h2", dict.insights);
  setText("#dashboardView .panel:nth-child(3) .panel-head span", dict.autoGenerated);
  setText("#dashboardView .panel:nth-child(4) h2", dict.topExpenses);
  els.viewTopExpensesButton.textContent = dict.viewAll;
  setText("#importView .dropzone h2", dict.uploadTitle);
  setText("#importView .dropzone p", dict.uploadCopy);
  els.chooseFileButton.textContent = dict.chooseFiles;
  setText("#importView .import-help h2", dict.builtInRecognition);
  setText("#importView .import-help p", dict.recognitionCopy);
  setText("#importView .bank-grid span:last-child", dict.csvPdfScreenshots);
  setText("#importView > .panel h2", dict.importResults);
  if (els.importSummary.textContent === "No imports yet" || els.importSummary.textContent === "尚未导入") els.importSummary.textContent = dict.noImports;
  els.searchInput.placeholder = dict.searchPlaceholder;
  setSelectTexts(els.typeFilter, [dict.all, dict.needsAction, dict.uncategorised, dict.needsReview, dict.income, dict.expense, dict.refunds, dict.duplicates]);
  setSelectTexts(els.transactionSortSelect, [dict.newest, dict.oldest, dict.amountHigh, dict.amountLow, dict.merchantAZ]);
  document.querySelector(".date-filter span").textContent = dict.to;
  els.usePeriodDateFilterButton.textContent = dict.usePeriod;
  els.clearDateFilterButton.textContent = dict.clearDates;
  els.findDuplicatesButton.textContent = dict.findDuplicates;
  setSelectTexts(els.pageSizeSelect, [dict.perPage(10), dict.perPage(25), dict.perPage(50), dict.perPage(100)]);
  els.prevPageButton.textContent = dict.previous;
  els.nextPageButton.textContent = dict.next;
  document.querySelectorAll("#transactionsView th").forEach((th, index) => th.textContent = dict.tableHeads[index]);
  document.querySelectorAll("[data-grain]").forEach((button) => button.textContent = dict.grains[button.dataset.grain]);
  setText("#analyticsView .metric:nth-child(1) span", dict.analysedIncome);
  setText("#analyticsView .metric:nth-child(2) span", dict.analysedExpense);
  setText("#analyticsView .metric:nth-child(3) span", dict.peakSpendPeriod);
  setText("#analyticsView .metric:nth-child(4) span", dict.averageSpend);
  setText("#analysisIncomeDelta", dict.noComparison);
  setText("#analysisExpenseDelta", dict.noComparison);
  setText("#analysisAverageLabel", dict.byCurrentGrain);
  setText("#analyticsView .panel:nth-child(2) h2", dict.merchantRanking);
  setText("#analyticsView .panel:nth-child(2) .panel-head span", dict.expense);
  setText("#analyticsView .panel:nth-child(3) h2", dict.budgetPressure);
  setText("#analyticsView .panel:nth-child(3) .panel-head span", dict.byCategory);
  setText("#analyticsView .panel:nth-child(4) h2", dict.macroCategories);
  setText("#recurringView .recurring-income-panel h2", dict.recurringIncome);
  setText("#recurringView .recurring-income-panel .panel-head span", dict.salaryEtc);
  setText("#recurringView .recurring-expense-panel h2", dict.recurringExpenses);
  setText("#recurringView .recurring-expense-panel .panel-head span", dict.billsSubscriptions);
  setText("#recurringView .recurring-detail-panel h2", dict.recurringItems);
  setText("#recurringView .recurring-detail-panel .panel-head span", dict.withinRange);
  setText("#rulesView .panel:nth-child(1) h2", dict.autoRules);
  els.ruleKeyword.placeholder = dict.keywordPlaceholder;
  document.querySelector("#ruleForm button").textContent = dict.add;
  setText("#rulesView .panel:nth-child(2) h2", dict.categoryLearning);
  setText("#rulesView .panel:nth-child(2) p", dict.categoryLearningCopy);
  els.categoryName.placeholder = dict.categoryPlaceholder;
  document.querySelector("#categoryForm button").textContent = dict.addCategory;
  const empty = document.getElementById("emptyStateTemplate").content;
  empty.querySelector("strong").textContent = dict.emptyTitle;
  empty.querySelector("span").textContent = dict.emptyText;
  if (els.saveIndicator && !els.saveIndicator.classList.contains("saved")) els.saveIndicator.textContent = dict.autoSave;
}

function setText(selector, text) {
  const element = document.querySelector(selector);
  if (element) element.textContent = text;
}

function setSelectTexts(select, texts) {
  [...select.options].forEach((option, index) => {
    option.textContent = texts[index] || option.textContent;
  });
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return { transactions: [], rules: defaultRules, categories: [], importLog: [] };
  }
  try {
    return normaliseState(JSON.parse(saved));
  } catch {
    return { transactions: [], rules: defaultRules, categories: [], importLog: [] };
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  showSaved();
  scheduleCloudSave();
}

function normaliseState(value) {
  return {
    transactions: Array.isArray(value?.transactions) ? value.transactions : [],
    rules: mergeDefaultRules(Array.isArray(value?.rules) ? value.rules : defaultRules),
    categories: Array.isArray(value?.categories) ? value.categories : [],
    importLog: Array.isArray(value?.importLog) ? value.importLog : []
  };
}

function showSaved() {
  if (!els.saveIndicator) return;
  els.saveIndicator.textContent = tr("saved");
  els.saveIndicator.classList.add("saved");
  clearTimeout(showSaved.timer);
  showSaved.timer = setTimeout(() => {
    els.saveIndicator.textContent = tr("autoSave");
    els.saveIndicator.classList.remove("saved");
  }, 1600);
}

async function initCloudSync() {
  if (!window.supabase?.createClient) {
    setCloudStatus(tr("cloudUnavailable"));
    return;
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user || null;
  updateAuthUi();
  if (currentUser) await loadCloudState({ merge: true });
  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    updateAuthUi();
    if (currentUser) await loadCloudState({ merge: true });
  });
}

function updateAuthUi() {
  const signedIn = Boolean(currentUser);
  if (els.authForm) els.authForm.classList.toggle("signed-in", signedIn);
  if (els.signInButton) els.signInButton.classList.toggle("hidden", signedIn);
  if (els.signUpButton) els.signUpButton.classList.toggle("hidden", signedIn);
  if (els.authPassword) els.authPassword.classList.toggle("hidden", signedIn);
  if (els.signOutButton) els.signOutButton.classList.toggle("hidden", !signedIn);
  if (els.authEmail) {
    els.authEmail.readOnly = signedIn;
    els.authEmail.value = signedIn ? currentUser.email || "" : els.authEmail.value;
  }
  setCloudStatus(signedIn ? tr("cloudReady") : tr("cloudOff"));
}

function setCloudStatus(message, isError = false) {
  if (els.authStatus) {
    els.authStatus.textContent = currentUser ? tr("account") : tr("signInShort");
    els.authStatus.classList.toggle("error", isError);
  }
  if (els.authMessage) {
    els.authMessage.textContent = message;
    els.authMessage.classList.toggle("error", isError);
  }
}

function openAuthModal() {
  if (!els.authModal) return;
  els.authModal.classList.remove("hidden");
  els.authModal.setAttribute("aria-hidden", "false");
  setTimeout(() => {
    if (currentUser) els.signOutButton?.focus();
    else els.authEmail?.focus();
  }, 0);
}

function closeAuthModal() {
  if (!els.authModal) return;
  els.authModal.classList.add("hidden");
  els.authModal.setAttribute("aria-hidden", "true");
}

function authCredentials() {
  const email = els.authEmail?.value.trim();
  const password = els.authPassword?.value;
  if (!email || !password) {
    setCloudStatus(tr("enterEmailPassword"), true);
    return null;
  }
  return { email, password };
}

async function signInWithEmail() {
  if (!supabaseClient) return setCloudStatus(tr("cloudUnavailable"), true);
  const credentials = authCredentials();
  if (!credentials) return;
  setCloudStatus(tr("cloudLoading"));
  const { error } = await supabaseClient.auth.signInWithPassword(credentials);
  if (error) return setCloudStatus(error.message, true);
}

async function signUpWithEmail() {
  if (!supabaseClient) return setCloudStatus(tr("cloudUnavailable"), true);
  const credentials = authCredentials();
  if (!credentials) return;
  setCloudStatus(tr("cloudLoading"));
  const { error } = await supabaseClient.auth.signUp(credentials);
  if (error) return setCloudStatus(error.message, true);
  setCloudStatus(tr("checkEmail"));
}

async function signOutCloud() {
  if (!supabaseClient) return;
  await saveCloudState();
  await supabaseClient.auth.signOut();
  currentUser = null;
  clearTimeout(cloudSaveTimer);
  state = { transactions: [], rules: defaultRules, categories: [], importLog: [] };
  localStorage.removeItem(STORAGE_KEY);
  pendingImport = null;
  activeMacroFilter = null;
  transactionPage = 1;
  hydrateControls();
  render();
  updateAuthUi();
  setCloudStatus(tr("signedOut"));
}

async function loadCloudState({ merge } = { merge: true }) {
  if (!supabaseClient || !currentUser) return;
  setCloudStatus(tr("cloudLoading"));
  const result = await withTimeout(
    supabaseClient
      .from("ledger_states")
      .select("state,data")
      .eq("user_id", currentUser.id)
      .maybeSingle()
  );
  if (result.timedOut) {
    setCloudStatus(tr("cloudTimeout"), true);
    return;
  }
  const { data, error } = result;
  if (error) {
    setCloudStatus(error.message, true);
    return;
  }

  applyingCloudState = true;
  const cloudState = data?.state || data?.data;
  if (cloudState) {
    state = merge ? mergeLedgerStates(state, normaliseState(cloudState)) : normaliseState(cloudState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    hydrateControls();
    render();
  }
  applyingCloudState = false;
  await saveCloudState();
}

function scheduleCloudSave() {
  if (applyingCloudState || !currentUser || !supabaseClient) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => saveCloudState(), 700);
}

async function saveCloudState() {
  if (!currentUser || !supabaseClient) return;
  setCloudStatus(tr("cloudSaving"));
  const result = await withTimeout(
    supabaseClient
      .from("ledger_states")
      .upsert({
        user_id: currentUser.id,
        state,
        data: state,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" })
  );
  if (result.timedOut) {
    setCloudStatus(tr("cloudTimeout"), true);
    return;
  }
  const { error } = result;
  setCloudStatus(error ? error.message : tr("cloudSaved"), Boolean(error));
}

async function withTimeout(request, milliseconds = 12000) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: true }), milliseconds);
  });
  const result = await Promise.race([request, timeout]);
  clearTimeout(timer);
  return result;
}

function debounce(fn, wait = 120) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function mergeLedgerStates(localState, cloudState) {
  return {
    transactions: mergeById(localState.transactions, cloudState.transactions),
    rules: mergeDefaultRules(mergeByRule(localState.rules, cloudState.rules)),
    categories: [...new Set([...(cloudState.categories || []), ...(localState.categories || [])])],
    importLog: mergeByBatch(localState.importLog, cloudState.importLog)
  };
}

function mergeById(localItems = [], cloudItems = []) {
  const map = new Map();
  [...cloudItems, ...localItems].forEach((item) => {
    if (!item) return;
    map.set(item.id || crypto.randomUUID(), item);
  });
  return [...map.values()];
}

function mergeByRule(localRules = [], cloudRules = []) {
  const map = new Map();
  [...cloudRules, ...localRules].forEach((rule) => {
    const key = `${String(rule.keyword || "").toLowerCase()}|${rule.category}`;
    if (rule.keyword) map.set(key, rule);
  });
  return [...map.values()];
}

function mergeByBatch(localLog = [], cloudLog = []) {
  const map = new Map();
  [...cloudLog, ...localLog].forEach((item) => {
    if (!item) return;
    map.set(item.batchId || `${item.name}-${item.date}`, item);
  });
  return [...map.values()].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

function cleanStoredTransaction(transaction) {
  if (!transaction || typeof transaction !== "object") return transaction;
  const originalDescription = transaction.description || "";
  const description = cleanOcrMerchantNoise(originalDescription);
  const merchant = cleanOcrMerchantNoise(transaction.merchant || description);
  let amount = Number(transaction.amount || 0);
  const fromImage = /\.(png|jpe?g|webp|bmp)$/i.test(transaction.sourceFile || "");
  const incomeLike = /\b(salary|payroll|refund|cashback|interest|hmrc|received|top up|deposit)\b/i.test(originalDescription);
  const refundHint = hasRefundMarker(originalDescription, String(transaction.amount || ""));
  if (isPositiveCategory(transaction.category)) {
    amount = Math.abs(amount);
  } else if (!transaction.edited && fromImage && amount > 0 && !incomeLike && !refundHint) {
    amount = -Math.abs(amount);
  }
  const category = refundHint && amount > 0 ? "Refunds / Reimbursements" : transaction.category;
  return { ...transaction, description, merchant, amount, category };
}

function getCategories() {
  return [...new Set([...defaultCategories, ...(state.categories || [])])];
}

function isPositiveCategory(category) {
  return /Salary Income|Other Income|refunds?|reimbursements?|cashback|income/i.test(String(category || ""));
}

function mergeDefaultRules(rules) {
  const existing = new Set(rules.map((rule) => String(rule.keyword || "").toLowerCase()));
  const missing = defaultRules.filter((rule) => !existing.has(rule.keyword.toLowerCase()));
  return [...rules, ...missing];
}

function setView(view) {
  currentView = view;
  closeTransactionFilters();
  if (view !== "transactions") transactionReturnView = null;
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((item) => {
    item.classList.toggle("active", item.id === `${view}View`);
  });
  const titles = {
    dashboard: tr("pageTitles.dashboard"),
    import: tr("pageTitles.import"),
    transactions: tr("pageTitles.transactions"),
    analytics: tr("pageTitles.analytics"),
    recurring: tr("pageTitles.recurring"),
    rules: tr("pageTitles.rules")
  };
  els.pageTitle.textContent = titles[view] || tr("pageTitles.dashboard");
  render();
  requestAnimationFrame(() => render());
}

function updateCurrentPeriodButton() {
  if (!els.currentPeriodButton || !els.periodSelect) return;
  const period = els.periodSelect.value;
  const range = getPeriodRange(period, periodAnchor);
  els.currentPeriodButton.textContent = formatPeriodButtonLabel(period, range);
  els.currentPeriodButton.title = tr("currentPeriod");
}

async function importFiles(files) {
  if (!files.length) return;
  const batchId = crypto.randomUUID();
  const importedAt = new Date().toISOString();
  const imported = [];
  const unsupported = [];
  const failed = [];
  els.importSummary.textContent = `Processing ${files.length} files...`;

  for (const file of files) {
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
      els.importSummary.textContent = `Parsing ${file.name}...`;
      const text = await file.text();
      const rows = parseCsv(text);
      const transactions = rows.map((row) => normaliseRow(row, file.name)).filter(Boolean);
      imported.push(...transactions);
    } else if (lower.endsWith(".pdf")) {
      try {
        els.importSummary.textContent = `Parsing PDF: ${file.name}...`;
        const transactions = await parsePdfStatement(file);
        if (transactions.length) {
          imported.push(...transactions);
        } else {
          failed.push(`${file.name}: no transaction rows found`);
        }
      } catch (error) {
        failed.push(`${file.name}: ${error.message}`);
      }
    } else if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp)$/i.test(file.name)) {
      try {
        els.importSummary.textContent = `OCR reading image: ${file.name}...`;
        const transactions = await parseImageStatement(file);
        if (transactions.length) {
          imported.push(...transactions);
        } else {
          failed.push({
            name: file.name,
            message: "OCR completed, but no importable transaction rows were found",
            detail: transactions.ocrPreview || "Not enough clear text was detected. Try uploading a crop that shows date, description, Money In / Money Out, and amount columns."
          });
        }
      } catch (error) {
        failed.push({ name: file.name, message: error.message, detail: "" });
      }
    } else {
      unsupported.push(file.name);
    }
  }

  pendingImport = buildPendingImport(imported, unsupported, failed, batchId, importedAt);
  renderPendingImportReview();
  els.fileInput.value = "";
}

function tagImportBatch(transaction, batchId, importedAt) {
  return { ...transaction, importBatchId: batchId, importedAt };
}

function buildPendingImport(transactions, unsupported, failed, batchId, importedAt) {
  const candidates = transactions.map((transaction) => ({
    ...transaction,
    pendingId: crypto.randomUUID(),
    selected: true,
    duplicate: false,
    duplicateReason: ""
  }));
  const pending = { batchId, importedAt, items: candidates, unsupported, failed };
  refreshPendingImportDuplicates(pending);
  return pending;
}

function refreshPendingImportDuplicates(pending = pendingImport) {
  if (!pending) return;
  const existing = new Set(state.transactions.map(transactionDedupeKey));
  const seen = new Set();
  pending.items.forEach((item) => {
    const key = transactionDedupeKey(item);
    const wasDuplicate = item.duplicate;
    if (existing.has(key)) {
      item.duplicate = true;
      item.duplicateReason = "Already exists";
      item.selected = false;
    } else if (seen.has(key)) {
      item.duplicate = true;
      item.duplicateReason = "Duplicate in this batch";
      item.selected = false;
    } else {
      item.duplicate = false;
      item.duplicateReason = "";
      if (wasDuplicate || item.selected !== false) item.selected = true;
      seen.add(key);
    }
  });
}

async function parseImageStatement(file) {
  const tesseract = await loadTesseract();
  const worker = await tesseract.createWorker("eng", 1, {
    workerPath: TESSERACT_WORKER_URL,
    corePath: TESSERACT_CORE_URL,
    langPath: "./",
    gzip: true,
    logger: (message) => {
      if (message.status === "recognizing text") {
        els.importSummary.textContent = `OCR reading image: ${file.name} ${Math.round((message.progress || 0) * 100)}%`;
      }
    }
  });

  try {
    const result = await worker.recognize(file);
    const lines = ocrResultToLines(result.data);
    const transactions = [
      ...parseLloydsStatementLines(lines, file.name),
      ...parseStatementLines(lines, file.name),
      ...parseStarlingTransactionLines(lines, file.name),
      ...parseMobileTransactionLines(lines, file.name)
    ];
    const parsed = dedupeTransactions(transactions).map((transaction) => ({
      ...transaction,
      confidence: Math.min(transaction.confidence, 0.62)
    }));
    parsed.ocrPreview = lines.slice(0, 18).join(" / ");
    return parsed;
  } finally {
    await worker.terminate();
  }
}

async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TESSERACT_URL;
    script.onload = resolve;
    script.onerror = () => reject(new Error("OCR engine could not load. Start the app with start-ledger.cmd, then try again."));
    document.head.appendChild(script);
  });
  return window.Tesseract;
}

function ocrResultToLines(data) {
  const textLines = String(data?.text || "").split(/\r?\n/);
  const structuredLines = Array.isArray(data?.lines) ? data.lines.map((line) => line.text) : [];
  return [...structuredLines, ...textLines]
    .map((line) => String(line).replace(/[|]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function parseLloydsStatementLines(lines, sourceFile) {
  const transactions = [];
  const statementYear = inferStatementYear(lines);

  lines.forEach((rawLine) => {
    const line = cleanOcrLine(rawLine);
    if (!line) return;
    splitLloydsTransactionSegments(line).forEach((segment) => {
      if (!segment || shouldSkipStatementTableLine(segment)) return;
      const transaction = parseLloydsTransactionLine(segment, sourceFile, statementYear);
      if (transaction) transactions.push(transaction);
    });
  });

  return transactions;
}

function splitLloydsTransactionSegments(line) {
  const starts = [...line.matchAll(/\b\d{1,2}\s*[A-Za-z]{3}\s*\d{2,4}\b/g)].map((match) => match.index).filter(Number.isFinite);
  if (!starts.length) return [line];
  return starts.map((start, index) => line.slice(start, starts[index + 1] || line.length).replace(/^\/+|\/+$/g, "").trim());
}

function inferStatementYear(lines) {
  const joined = lines.join(" ");
  const rangeMatch = joined.match(/\b\d{1,2}\s+[A-Za-z]{3,9}\s+(\d{4})\s+to\s+\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/i);
  if (rangeMatch) return Number(rangeMatch[1]);
  const yearMatch = joined.match(/\b(20\d{2})\b/);
  return yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();
}

function shouldSkipStatementTableLine(line) {
  return /^(date|description|type|money in|money out|balance|your transactions|your account|sort code|account number|page \d|lloyds|classic)\b/i.test(line)
    || /\bcontinued on next page\b/i.test(line)
    || /\bif you think something is incorrect\b/i.test(line)
    || /\bbalance on\b/i.test(line)
    || /\bmoney in\b/i.test(line)
    || /\bmoney out\b/i.test(line)
    || /^\d+\s+of\s+\d+/i.test(line);
}

function parseLloydsTransactionLine(line, sourceFile, statementYear) {
  const match = line.match(/^(\d{1,2})\s*([A-Za-z]{3})\s*(\d{2,4})\s+(.+?)\s+(DD|FPI|DEB|FPO|TFR|SO|BP|CHQ|CPT|BGC|INT)\s+(.+)$/i);
  if (!match) return null;

  const [, day, monthName, yearText, rawDescription, rawType, amountPart] = match;
  const year = yearText.length === 2 ? `20${yearText}` : yearText || String(statementYear);
  const date = parseDate(`${day} ${monthName} ${year}`);
  if (!date) return null;

  const amountTokens = [...amountPart.matchAll(/\(?[+-]?(?:拢\s*)?[+-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?/g)].map((item) => item[0]);
  if (amountTokens.length < 2) return null;

  const values = amountTokens.map(parseMoney).filter(Number.isFinite);
  if (values.length < 2) return null;

  const transactionAmount = Math.abs(values[0]);
  const balance = values[values.length - 1];
  const type = rawType.toUpperCase();
  const moneyInTypes = new Set(["FPI", "BGC", "CHQ", "INT"]);
  const amount = moneyInTypes.has(type) ? transactionAmount : -transactionAmount;
  const description = cleanOcrMerchantNoise(rawDescription);
  if (!description) return null;
  const classified = classify(`${description} ${type}`, amount);

  return {
    id: crypto.randomUUID(),
    date,
    description,
    merchant: simplifyMerchant(description),
    amount: roundMoney(amount),
    currency: "GBP",
    bank: "lloyds",
    account: "lloyds",
    category: classified.category,
    confidence: 0.86,
    balance,
    sourceFile,
    importedAt: new Date().toISOString(),
    edited: false
  };
}

function parseMobileTransactionLines(lines, sourceFile) {
  if (looksLikeStatementTable(lines)) return [];
  const transactions = [];
  let currentDate = "";
  let pendingMerchant = "";

  lines.forEach((rawLine) => {
    const line = cleanOcrLine(rawLine);
    if (!line || isMobileUiLine(line)) return;

    const date = parseMobileDateHeader(line);
    if (date) {
      currentDate = date;
      pendingMerchant = "";
      return;
    }

    if (!currentDate || isTimeOnly(line)) return;

    const amountMatches = [...line.matchAll(/\(?[+-]?(?:拢\s*)?[+-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?/g)];
    if (amountMatches.length) {
      const amountToken = amountMatches[amountMatches.length - 1][0];
      const rawAmount = parseMoney(amountToken);
      const rawDescription = line.replace(amountToken, "").replace(/\s+/g, " ").trim() || pendingMerchant;
      const refundHint = hasRefundMarker(rawDescription, amountToken);
      const description = cleanOcrMerchantNoise(rawDescription);
      const amount = inferMobileAmount(rawAmount, amountToken, rawDescription);
      if (!Number.isFinite(amount) || amount === 0) return;

      if (!description || isMobileUiLine(description)) return;
      transactions.push(buildImportedTransaction({
        date: currentDate,
        description,
        amount,
        sourceFile,
        confidence: amountToken.includes("-") || amountToken.includes("(") || refundHint ? 0.78 : 0.58,
        refundHint
      }));
      pendingMerchant = "";
      return;
    }

    if (looksLikeMerchantLine(line)) {
      pendingMerchant = cleanOcrMerchantNoise(line);
    }
  });

  return transactions;
}

function parseStarlingTransactionLines(lines, sourceFile) {
  const parts = lines
    .flatMap((line) => cleanOcrLine(line).split(/\s+\/\s+|\/(?=\s*[A-Z][a-z]+day,)/))
    .map((line) => line.trim())
    .filter(Boolean);
  const transactions = [];
  let currentDate = "";
  let pending = null;

  const flush = () => {
    if (!pending) return;
    transactions.push(buildImportedTransaction({
      date: pending.date,
      description: pending.category ? `${pending.merchant} ${pending.category}` : pending.merchant,
      amount: pending.amount,
      sourceFile,
      confidence: pending.amount > 0 ? 0.82 : 0.72,
      refundHint: pending.amount > 0
    }));
    pending = null;
  };

  parts.forEach((rawPart) => {
    const part = cleanOcrLine(rawPart);
    const date = parseStarlingDateHeader(part);
    if (date) {
      flush();
      currentDate = date;
      return;
    }
    if (!currentDate || isMobileUiLine(part)) return;

    const detail = part.match(/^\d{1,2}:\d{2}\s*[-路]\s*(.+)$/);
    if (detail && pending) {
      pending.category = detail[1].trim();
      flush();
      return;
    }

    const amountMatch = part.match(/([+-]?\s*(?:鎷拢)\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*$/);
    if (!amountMatch) return;
    flush();
    const amountToken = amountMatch[1];
    const merchant = cleanStarlingMerchant(part.slice(0, amountMatch.index).trim());
    if (!merchant || isMobileUiLine(merchant)) return;
    pending = {
      date: currentDate,
      merchant,
      amount: amountToken.includes("+") ? Math.abs(parseMoney(amountToken)) : -Math.abs(parseMoney(amountToken)),
      category: ""
    };
  });
  flush();

  return dedupeTransactions(transactions);
}

function parseStarlingDateHeader(line) {
  const match = line.match(/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+([A-Za-z]{3,9})\s+(\d{1,2})\b/i);
  if (!match) return "";
  return parseDate(`${match[2]} ${match[1]} ${new Date().getFullYear()}`);
}

function cleanStarlingMerchant(value) {
  return cleanOcrMerchantNoise(String(value)
    .replace(/^[^\w]+/g, "")
    .replace(/^(?:@|S|漏|C|O|0|鈥攟-)\s+(?=[A-Za-z])/i, "")
    .replace(/\s+/g, " ")
    .trim());
}

function looksLikeStatementTable(lines) {
  const joined = lines.join(" ").toLowerCase();
  return joined.includes("money in") && joined.includes("money out") && joined.includes("balance")
    || joined.includes("your transactions") && /\b(fpi|fpo|deb|dd|tfr)\b/i.test(joined);
}

function cleanOcrLine(line) {
  return String(line)
    .replace(/[|]/g, " ")
    .replace(/[鈥斺€撯垝]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanOcrMerchantNoise(description) {
  const raw = String(description);
  const noisePrefix = /^(?:[0oO]|[bB][yY]|[wW]\+?|[sS]|[iIlL1|]{1,2}|[a-z]{1,3}|[<>]?\d+|[-+*/\\.,:;]+|[A-Z]{1,3}-)\s+(?=[A-Z][A-Za-z'&.-]{2,})/;
  return dedupeMerchantWords(raw
    .replace(/^(?:[0oO]\s+)+(?=[A-Za-z])/g, "")
    .replace(/^(?:by|w\+?|wt\.?|wti\.?|s|o|a|--|-)\s+(?=[A-Z])/i, "")
    .replace(/^[^\w拢$鈧?()-]*(?:by|w\+?|s|o)\s+(?=[A-Z])/i, "")
    .replace(noisePrefix, "")
    .replace(/^\W+(?=[A-Za-z])/g, "")
    .replace(/\s+[~-]+$/g, "")
    .replace(/\s+\+$/g, "")
    .replace(/\s+/g, " ")
    .trim());
}

function dedupeMerchantWords(description) {
  const words = description.split(" ");
  if (words.length === 2 && words[0].toLowerCase() === words[1].toLowerCase()) {
    return canonicalMerchantName(words[0]);
  }
  return canonicalMerchantName(description);
}

function canonicalMerchantName(description) {
  const exact = description.trim().toLowerCase();
  const aliases = {
    ub: "Uber",
    "asda asda": "ASDA",
    "tiktok shop +": "TikTok Shop",
    "fa tiktok shop": "TikTok Shop",
    "fa- tiktok shop": "TikTok Shop"
  };
  return aliases[exact] || description;
}

function hasRefundMarker(description, amountToken) {
  return /\+\s*$/.test(String(description).trim()) || amountToken.includes("+");
}

function inferMobileAmount(rawAmount, amountToken, description) {
  if (!Number.isFinite(rawAmount)) return NaN;
  const lower = description.toLowerCase();
  const incomeLike = /\b(salary|payroll|refund|cashback|interest|hmrc|received|top up|deposit)\b/.test(lower);
  const explicitPositive = hasRefundMarker(description, amountToken);
  const explicitNegative = amountToken.includes("-") || /^\(.*\)$/.test(amountToken);
  if (explicitNegative) return -Math.abs(rawAmount);
  if (explicitPositive || incomeLike) return Math.abs(rawAmount);
  return -Math.abs(rawAmount);
}

function parseMobileDateHeader(line) {
  const lower = line.toLowerCase();
  const today = new Date();
  if (lower === "today") return toDateInputValue(today);
  if (lower === "yesterday") {
    const date = new Date(today);
    date.setDate(today.getDate() - 1);
    return toDateInputValue(date);
  }
  if (/^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}$/.test(line)) return parseDate(line);
  if (/^\d{1,2}\s+[A-Za-z]{3,9}$/.test(line)) return parseDate(line);
  return "";
}

function isMobileUiLine(line) {
  return /^(transactions?|all currencies|current account|card|balance|search|filter|done|cancel|pending)$/i.test(line)
    || /^(\*|鈥\.|\s)*\d{4}$/.test(line)
    || /^[<>x脳]$/.test(line);
}

function isTimeOnly(line) {
  return /^\d{1,2}:\d{2}$/.test(line);
}

function looksLikeMerchantLine(line) {
  if (line.length < 2 || line.length > 80) return false;
  if (isTimeOnly(line) || isMobileUiLine(line)) return false;
  if (/^\d+$/.test(line)) return false;
  return /[A-Za-z]/.test(line);
}

function buildImportedTransaction({ date, description, amount, sourceFile, confidence, refundHint = false }) {
  description = cleanOcrMerchantNoise(description);
  const merchant = simplifyMerchant(description);
  const classified = classify(`${merchant} ${description}`, amount);
  const bank = inferBank(sourceFile, { description });

  return {
    id: crypto.randomUUID(),
    date,
    description,
    merchant,
    amount: roundMoney(amount),
    currency: "GBP",
    bank,
    account: bank,
    category: refundHint && amount > 0 ? "Refunds / Reimbursements" : classified.category,
    confidence: Math.min(classified.confidence, confidence),
    balance: null,
    sourceFile,
    importedAt: new Date().toISOString(),
    edited: false
  };
}

async function parsePdfStatement(file) {
  const pdfjs = await loadPdfJs();
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const lines = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    lines.push(...textContentToLines(content.items));
  }

  return parseStatementLines(lines, file.name);
}

async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  try {
    const pdfjs = await import(PDFJS_URL);
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    window.pdfjsLib = pdfjs;
    return pdfjs;
  } catch {
    throw new Error("PDF parser could not load. Start the local server with node server.mjs, then import the PDF again.");
  }
}

function textContentToLines(items) {
  const rows = new Map();
  items.forEach((item) => {
    const text = String(item.str || "").trim();
    if (!text) return;
    const [, , , , x, y] = item.transform;
    const key = Math.round(y / 3) * 3;
    const row = rows.get(key) || [];
    row.push({ x, text });
    rows.set(key, row);
  });

  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, row]) => row.sort((a, b) => a.x - b.x).map((cell) => cell.text).join(" "))
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function parseStatementLines(lines, sourceFile) {
  const transactions = [];
  let pending = null;

  lines.forEach((line) => {
    const parsed = parseStatementLine(line, sourceFile);
    if (parsed) {
      if (pending) transactions.push(pending);
      pending = parsed;
    } else if (pending && shouldAppendPdfLine(line)) {
      pending.description = `${pending.description} ${line}`.slice(0, 180);
      pending.merchant = simplifyMerchant(pending.description);
      const classified = classify(`${pending.merchant} ${pending.description}`, pending.amount);
      pending.category = classified.category;
      pending.confidence = Math.min(pending.confidence, classified.confidence, 0.72);
    }
  });

  if (pending) transactions.push(pending);
  return transactions;
}

function parseStatementLine(line, sourceFile) {
  if (/\s(DD|FPI|DEB|FPO|TFR|SO|BP|CHQ|CPT)\s+/i.test(line)) return null;
  const match = line.match(/^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/. -]\d{1,2}(?:[/. -]\d{2,4})?|\d{1,2}\s+[A-Za-z]{3,9}(?:\s+\d{2,4})?)\s+(.+)$/);
  if (!match) return null;

  const date = parseDate(match[1]);
  if (!date) return null;

  const rest = match[2].replace(/\s+/g, " ").trim();
  const amountMatches = [...rest.matchAll(/\(?-?(?:拢\s*)?-?\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?/g)];
  if (!amountMatches.length) return null;

  const moneyTokens = amountMatches.map((item) => item[0]);
  const values = moneyTokens.map(parseMoney).filter(Number.isFinite);
  if (!values.length) return null;

  const descriptionEnd = amountMatches[0].index ?? rest.length;
  const description = rest.slice(0, descriptionEnd).replace(/\s+/g, " ").trim() || rest;
  const amountInfo = inferPdfAmount(description, moneyTokens, values);
  if (!Number.isFinite(amountInfo.amount) || amountInfo.amount === 0) return null;

  const merchant = simplifyMerchant(description);
  const classified = classify(`${merchant} ${description}`, amountInfo.amount);

  return {
    id: crypto.randomUUID(),
    date,
    description,
    merchant,
    amount: roundMoney(amountInfo.amount),
    currency: "GBP",
    bank: inferBank(sourceFile, { description }),
    account: inferBank(sourceFile, { description }),
    category: classified.category,
    confidence: Math.min(classified.confidence, amountInfo.confidence),
    balance: amountInfo.balance,
    sourceFile,
    importedAt: new Date().toISOString(),
    edited: false
  };
}

function inferPdfAmount(description, tokens, values) {
  const lower = description.toLowerCase();
  const incomeWords = /\b(salary|payroll|wage|credit|interest|refund|hmrc|payment received|faster payment in)\b/.test(lower);
  const explicitDebit = /\b(debit|direct debit|card payment|standing order|fee|charge|withdrawal)\b/.test(lower);
  const signedToken = tokens.find((token) => token.includes("-") || token.includes("("));

  if (values.length >= 3) {
    const balance = values[values.length - 1];
    const debit = Math.abs(values[values.length - 3]);
    const credit = Math.abs(values[values.length - 2]);
    if (debit && !credit) return { amount: -debit, balance, confidence: 0.82 };
    if (credit && !debit) return { amount: credit, balance, confidence: 0.82 };
  }

  if (signedToken) {
    const signed = parseMoney(signedToken);
    return { amount: signed, balance: values.length > 1 ? values[values.length - 1] : null, confidence: 0.86 };
  }

  const candidate = values.length > 1 ? values[values.length - 2] : values[0];
  const balance = values.length > 1 ? values[values.length - 1] : null;
  const sign = incomeWords && !explicitDebit ? 1 : -1;
  return { amount: Math.abs(candidate) * sign, balance, confidence: incomeWords || explicitDebit ? 0.72 : 0.56 };
}

function shouldAppendPdfLine(line) {
  if (!line || /^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}/.test(line)) return false;
  if (/^(date|description|balance|money in|money out|payments?|receipts?|statement|page)\b/i.test(line)) return false;
  return !/(?:拢\s*)?\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(line);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);

  if (rows.length < 2) return [];
  const headers = rows[0].map(cleanHeader);
  return rows.slice(1).map((values) => {
    const object = {};
    headers.forEach((header, index) => {
      object[header] = values[index] || "";
    });
    return object;
  });
}

function cleanHeader(header) {
  return header.toLowerCase().replace(/^\uFEFF/, "").replace(/[^a-z0-9]+/g, "");
}

function normaliseRow(row, sourceFile) {
  const dateRaw = pick(row, ["date", "transactiondate", "completeddate", "settleddate", "posteddate", "created"]);
  const date = parseDate(dateRaw);
  if (!date) return null;

  const description = pick(row, ["description", "name", "merchant", "counterparty", "payee", "narrative", "reference", "details"]) || "Unknown";
  const merchant = pick(row, ["merchant", "name", "counterparty", "payee"]) || simplifyMerchant(description);
  const moneyIn = parseMoney(pick(row, ["moneyin", "paidin", "credit", "in", "deposit"]));
  const moneyOut = parseMoney(pick(row, ["moneyout", "paidout", "debit", "out", "withdrawal"]));
  const amountRaw = parseMoney(pick(row, ["amount", "transactionamount", "value"]));
  let amount = 0;

  if (Number.isFinite(moneyIn) && moneyIn !== 0) amount = Math.abs(moneyIn);
  else if (Number.isFinite(moneyOut) && moneyOut !== 0) amount = -Math.abs(moneyOut);
  else if (Number.isFinite(amountRaw)) amount = amountRaw;
  else return null;

  const bank = inferBank(sourceFile, row);
  const balance = parseMoney(pick(row, ["balance", "runningbalance"]));
  const classified = classify(`${merchant} ${description}`, amount);

  return {
    id: crypto.randomUUID(),
    date,
    description,
    merchant,
    amount: roundMoney(amount),
    currency: "GBP",
    bank,
    account: pick(row, ["account", "accountname"]) || bank,
    category: classified.category,
    confidence: classified.confidence,
    balance: Number.isFinite(balance) ? balance : null,
    sourceFile,
    importedAt: new Date().toISOString(),
    edited: false
  };
}

function pick(row, keys) {
  for (const key of keys) {
    if (row[key]) return row[key];
  }
  return "";
}

function parseDate(value, fallbackYear = new Date().getFullYear()) {
  if (!value) return "";
  const trimmed = String(value).trim();
  const isoDate = trimmed.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$/);
  if (isoDate) return formatDateParts(isoDate[1], isoDate[2], isoDate[3]);
  const monthMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{2,4}))?$/);
  if (monthMatch) {
    const months = {
      jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03",
      apr: "04", april: "04", may: "05", jun: "06", june: "06", jul: "07", july: "07",
      aug: "08", august: "08", sep: "09", sept: "09", september: "09", oct: "10",
      october: "10", nov: "11", november: "11", dec: "12", december: "12"
    };
    const [, day, monthName, year] = monthMatch;
    const month = months[monthName.toLowerCase()];
    if (month) {
      const yearText = year || String(fallbackYear);
      const fullYear = yearText.length === 2 ? `20${yearText}` : yearText;
      return formatDateParts(fullYear, month, day);
    }
  }
  const match = trimmed.match(/^(\d{1,2})[/. -](\d{1,2})(?:[/. -](\d{2,4}))?$/);
  if (match) {
    const [, day, month, year] = match;
    const yearText = year || String(fallbackYear);
    const fullYear = yearText.length === 2 ? `20${yearText}` : yearText;
    return formatDateParts(fullYear, month, day);
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.valueOf()) ? "" : toDateInputValue(parsed);
}

function formatDateParts(year, month, day) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseMoney(value) {
  if (value === undefined || value === null || value === "") return NaN;
  const raw = String(value).trim();
  const negative = raw.includes("-") || /^\(.*\)$/.test(raw);
  const cleaned = raw.replace(/[拢$鈧?\s()+-]/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number * (negative ? -1 : 1) : NaN;
}

function simplifyMerchant(description) {
  return String(description)
    .replace(/\b(card payment|direct debit|faster payment|standing order|pos)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 44);
}

function inferBank(fileName, row) {
  const haystack = `${fileName} ${Object.values(row).join(" ")}`.toLowerCase();
  const banks = ["monzo", "starling", "barclays", "hsbc", "lloyds", "natwest", "santander", "revolut", "chase"];
  return banks.find((bank) => haystack.includes(bank)) || "Bank Account";
}

function classify(text, amount) {
  const lower = text.toLowerCase();
  if (amount > 0 && /\b(refund|cashback|reimbursement|returned|reversal)\b/.test(lower)) {
    return { category: "Refunds / Reimbursements", confidence: 0.9 };
  }
  const rule = state.rules.find((item) => lower.includes(item.keyword.toLowerCase()));
  if (rule) return { category: rule.category, confidence: 0.92 };
  if (amount > 1000) return { category: "Other Income", confidence: 0.54 };
  if (amount > 0) return { category: "Other Income", confidence: 0.48 };
  return { category: "Uncategorised", confidence: 0.32 };
}

function dedupeTransactions(transactions) {
  const seen = new Set();
  return transactions.filter((transaction) => {
    const key = transactionDedupeKey(transaction);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function transactionDedupeKey(transaction) {
  return [
    parseDate(transaction.date) || transaction.date,
    Number(transaction.amount || 0).toFixed(2),
    String(transaction.description || transaction.merchant || "").toLowerCase().replace(/\s+/g, " ").trim(),
    String(transaction.bank || "").toLowerCase()
  ].join("|");
}

function transactionLooseDedupeKey(transaction) {
  return [
    parseDate(transaction.date) || transaction.date,
    Number(transaction.amount || 0).toFixed(2),
    String(transaction.merchant || transaction.description || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
    String(transaction.bank || "").toLowerCase()
  ].join("|");
}

function duplicateTransactionKeys(transactions) {
  const counts = new Map();
  transactions.forEach((transaction) => {
    const key = transactionLooseDedupeKey(transaction);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key));
}

function sortTransactionRows(rows, sort) {
  return [...rows].sort((a, b) => {
    if (sort === "date_asc") return parseLocalDate(a.date) - parseLocalDate(b.date);
    if (sort === "amount_abs_desc") return Math.abs(b.amount) - Math.abs(a.amount) || sortTransactionsByDateDesc(a, b);
    if (sort === "amount_abs_asc") return Math.abs(a.amount) - Math.abs(b.amount) || sortTransactionsByDateDesc(a, b);
    if (sort === "merchant_asc") return String(a.merchant || "").localeCompare(String(b.merchant || "")) || sortTransactionsByDateDesc(a, b);
    return sortTransactionsByDateDesc(a, b);
  });
}

function reclassifyTransactions() {
  state.transactions = state.transactions.map((transaction) => {
    if (transaction.edited) return transaction;
    const classified = classify(`${transaction.merchant} ${transaction.description}`, transaction.amount);
    return { ...transaction, category: classified.category, confidence: classified.confidence };
  });
}

function render() {
  renderDashboard();
  renderTransactions();
  renderAnalytics();
  renderRecurring();
  renderRules();
}

function renderDashboard() {
  const period = els.periodSelect.value;
  const range = getPeriodRange(period, periodAnchor);
  const previousRange = shiftRange(range, -1);
  const reportTransactions = reportingTransactions(state.transactions);
  const scoped = transactionsInRange(reportTransactions, range);
  const previous = transactionsInRange(reportTransactions, previousRange);
  const income = sum(scoped.filter((item) => item.amount > 0), "amount");
  const expense = Math.abs(sum(scoped.filter((item) => item.amount < 0), "amount"));
  const net = income - expense;
  const previousIncome = sum(previous.filter((item) => item.amount > 0), "amount");
  const previousExpense = Math.abs(sum(previous.filter((item) => item.amount < 0), "amount"));
  const previousNet = previousIncome - previousExpense;

  updateCurrentPeriodButton();
  els.periodRangeLabel.textContent = `${periodName(period)} · ${formatRange(range)}`;
  els.periodCompareLabel.textContent = `${tr("previousPeriod")} ${formatRange(previousRange)}`;
  els.incomeMetric.textContent = money(income);
  els.expenseMetric.textContent = money(expense);
  els.netMetric.textContent = money(net);
  els.reviewMetric.textContent = String(scoped.filter((item) => item.confidence < 0.6).length);
  els.incomeDelta.textContent = deltaText(income, previousIncome);
  els.expenseDelta.textContent = deltaText(expense, previousExpense);
  els.netDelta.textContent = `${net >= 0 ? tr("cashflowPositive") : tr("cashflowNegative")} · ${deltaText(net, previousNet)}`;

  renderCashflowChart(period, range);
  renderCategoryBars(scoped);
  renderInsights(scoped);
  renderTopExpenses(scoped);
  renderPeriodBreakdown(scoped, previous, period);
}

function shiftPeriod(direction) {
  const period = els.periodSelect.value;
  periodAnchor = addPeriod(periodAnchor, period, direction);
  render();
}

function transactionsInRange(transactions, range) {
  return transactions.filter((transaction) => {
    const date = parseLocalDate(transaction.date);
    return date >= range.start && date <= range.end;
  });
}

function reportingTransactions(transactions) {
  const offsetIds = findRefundOffsetIds(transactions);
  return transactions.filter((transaction) => !offsetIds.has(transaction.id));
}

function findRefundOffsetIds(transactions) {
  const positives = transactions
    .filter((item) => item.amount > 0 && isRefundLike(item))
    .sort(sortTransactionsByDateDesc);
  const negatives = transactions
    .filter((item) => item.amount < 0)
    .sort(sortTransactionsByDateDesc);
  const usedNegatives = new Set();
  const offsetIds = new Set();

  positives.forEach((positive) => {
    const match = negatives.find((negative) => {
      if (usedNegatives.has(negative.id)) return false;
      if (Math.abs(Math.abs(negative.amount) - positive.amount) > 0.01) return false;
      const days = Math.abs(parseLocalDate(positive.date) - parseLocalDate(negative.date)) / 86400000;
      if (days > 45) return false;
      return merchantLooksRelated(positive, negative);
    });
    if (match) {
      offsetIds.add(positive.id);
      offsetIds.add(match.id);
      usedNegatives.add(match.id);
    }
  });

  return offsetIds;
}

function isRefundLike(transaction) {
  return transaction.amount > 0 && (
    /refund|reimburse|cashback|returned|reversal|退款/i.test(`${transaction.category} ${transaction.description} ${transaction.merchant}`)
    || !isPositiveCategory(transaction.category)
  );
}

function merchantLooksRelated(a, b) {
  const left = normaliseMerchantForMatch(`${a.merchant} ${a.description}`);
  const right = normaliseMerchantForMatch(`${b.merchant} ${b.description}`);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left) || sharedTokenCount(left, right) > 0;
}

function normaliseMerchantForMatch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/refund|reimbursement|cashback|payment|card|faster|fp[io]|deb|dd|pos|shop|co|uk|ltd|limited/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sharedTokenCount(a, b) {
  const left = new Set(a.split(/\s+/).filter((token) => token.length > 2));
  return b.split(/\s+/).filter((token) => left.has(token)).length;
}

function samePeriod(date, anchor, period) {
  if (period === "day") return date.toDateString() === anchor.toDateString();
  if (period === "week") return weekKey(date) === weekKey(anchor);
  if (period === "month") return date.getFullYear() === anchor.getFullYear() && date.getMonth() === anchor.getMonth();
  return date.getFullYear() === anchor.getFullYear();
}

function renderCashflowChart(period, range) {
  const grain = period === "year" ? "month" : period === "month" ? "week" : "day";
  const windowRange = getChartWindowRange(period, range);
  const points = fillPeriodPoints(transactionsInRange(reportingTransactions(state.transactions), windowRange), grain, windowRange);
  drawChart(els.cashflowChart, points, { mode: "cashflow" });
  els.trendLabel.textContent = isMobileLayout()
    ? `${displayPeriodName(grain)} view`
    : `${formatRange(windowRange)} · ${tr("by")} ${displayPeriodName(grain)}`;
}

function renderCategoryBars(transactions) {
  const expenses = transactions.filter((item) => item.amount < 0);
  const grouped = groupTotals(expenses, (item) => item.category, true).slice(0, 8);
  const total = grouped.reduce((acc, item) => acc + item.total, 0);
  els.categoryTotal.textContent = money(total);
  els.categoryBars.innerHTML = grouped.length ? grouped.map((item) => barRow(item.label, item.total, total)).join("") : emptyState();
  bindCategoryDrilldowns(els.categoryBars);
}

function renderPeriodBreakdown(current, previous, period) {
  const currentIncome = sum(current.filter((item) => item.amount > 0), "amount");
  const currentExpense = Math.abs(sum(current.filter((item) => item.amount < 0), "amount"));
  const previousIncome = sum(previous.filter((item) => item.amount > 0), "amount");
  const previousExpense = Math.abs(sum(previous.filter((item) => item.amount < 0), "amount"));
  const topMerchant = groupTotals(current.filter((item) => item.amount < 0), (item) => item.merchant, true)[0];
  els.periodBreakdown.innerHTML = `
    <button type="button" data-dashboard-drilldown="income"><span>${tr("periodIncome")(displayPeriodName(period))}</span><strong>${money(currentIncome)}</strong><small>${deltaText(currentIncome, previousIncome)}</small></button>
    <button type="button" data-dashboard-drilldown="expense"><span>${tr("periodExpense")(displayPeriodName(period))}</span><strong>${money(currentExpense)}</strong><small>${deltaText(currentExpense, previousExpense)}</small></button>
    <button type="button" data-dashboard-drilldown="net"><span>${tr("transactionCount")}</span><strong>${current.length}</strong><small>${tr("previousItems")(previous.length)}</small></button>
    <button type="button" data-dashboard-drilldown="merchant" data-merchant="${escapeHtml(topMerchant?.label || "")}"><span>${tr("topMerchant")}</span><strong>${escapeHtml(topMerchant?.label || tr("none"))}</strong><small>${topMerchant ? money(topMerchant.total) : tr("noSpending")}</small></button>
  `;
  els.periodBreakdown.querySelectorAll("[data-dashboard-drilldown]").forEach((button) => {
    button.addEventListener("click", () => openDashboardTransactions(button.dataset.dashboardDrilldown, button.dataset.merchant || ""));
  });
  renderTimelineBreakdown(current, period, getPeriodRange(period, periodAnchor));
}

function renderTimelineBreakdown(transactions, period, range) {
  if (!els.weeklyBreakdown) return;
  const grain = period === "year" ? "month" : period === "month" ? "week" : "day";
  const points = fillPeriodPoints(transactions, grain, range);
  const max = Math.max(...points.map((item) => Math.max(item.income, item.expense)), 0);
  els.weeklyBreakdown.innerHTML = points.length ? `
    <div class="weekly-head"><strong>${displayPeriodName(grain)} breakdown</strong><span>${tr("weeklyLegend")}</span></div>
    ${points.map((point, index) => {
      const count = transactions.filter((item) => periodKey(parseLocalDate(item.date), grain) === point.label).length;
      const incomePercent = max ? Math.max(3, (point.income / max) * 100) : 0;
      const expensePercent = max ? Math.max(3, (point.expense / max) * 100) : 0;
      return `
        <button type="button" class="weekly-row" data-breakdown-label="${escapeHtml(point.label)}" data-breakdown-grain="${grain}">
          <span><strong>${escapeHtml(shortPeriodLabel(point.label, grain, index))}</strong><small>${tr("items")(count)}</small></span>
          <span class="weekly-bars">
            <i class="weekly-income" style="width:${incomePercent}%"><b>In ${money(point.income)}</b></i>
            <i class="weekly-expense" style="width:${expensePercent}%"><b>Out ${money(point.expense)}</b></i>
          </span>
          <span class="${point.net >= 0 ? "amount-income" : "amount-expense"}">${money(point.net)}</span>
        </button>
      `;
    }).join("")}
  ` : "";
  els.weeklyBreakdown.querySelectorAll("[data-breakdown-label]").forEach((button) => {
    button.addEventListener("click", () => openPeriodTransactions(button.dataset.breakdownLabel, button.dataset.breakdownGrain));
  });
}

function isMobileLayout() {
  return window.matchMedia?.("(max-width: 760px)").matches || window.innerWidth <= 760;
}

function openPeriodTransactions(label, grain) {
  const range = rangeFromPeriodLabel(label, grain);
  if (!range) return;
  activeMacroFilter = null;
  els.searchInput.value = "";
  els.categoryFilter.value = "all";
  els.typeFilter.value = "all";
  els.transactionStartDate.value = toDateInputValue(range.start);
  els.transactionEndDate.value = toDateInputValue(range.end);
  transactionPage = 1;
  transactionReturnView = "dashboard";
  setView("transactions");
}

function rangeFromPeriodLabel(label, grain) {
  if (grain === "week") {
    const [yearText, weekText] = String(label).split("-W");
    return weekRange(Number(yearText), Number(weekText));
  }
  if (grain === "month") {
    const match = String(label).match(/^(\d{2}|\d{4})-(\d{2})$/);
    if (!match) return null;
    const year = match[1].length === 2 ? 2000 + Number(match[1]) : Number(match[1]);
    const month = Number(match[2]) - 1;
    return getPeriodRange("month", new Date(year, month, 1));
  }
  if (grain === "day") {
    return getPeriodRange("day", parseLocalDate(label));
  }
  return null;
}

function weekRange(year, week) {
  const janFourth = new Date(year, 0, 4);
  const day = janFourth.getDay() || 7;
  const weekOneMonday = new Date(year, 0, 4 - day + 1);
  const start = new Date(weekOneMonday.getFullYear(), weekOneMonday.getMonth(), weekOneMonday.getDate() + (week - 1) * 7);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { start, end };
}

function renderInsights(transactions) {
  if (!state.transactions.length) {
    els.insights.innerHTML = emptyState();
    return;
  }
  const expenses = transactions.filter((item) => item.amount < 0);
  const topCategory = groupTotals(expenses, (item) => item.category, true)[0];
  const subscriptions = expenses.filter((item) => item.category === "Subscriptions");
  const income = sum(transactions.filter((item) => item.amount > 0), "amount");
  const expense = Math.abs(sum(expenses, "amount"));
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
  const insights = [
    topCategory ? tr("topCategoryInsight")(categoryDisplayLabel(topCategory.label), money(topCategory.total)) : tr("noExpenses"),
    subscriptions.length ? tr("recurringInsight")(subscriptions.length, money(Math.abs(sum(subscriptions, "amount")))) : tr("noSubscriptions"),
    income > 0 ? tr("savingsInsight")(savingsRate.toFixed(1)) : tr("importSalary")
  ];
  els.insights.innerHTML = insights.map((text) => `<div class="insight">${escapeHtml(text)}</div>`).join("");
}

function renderTopExpenses(transactions) {
  const rows = transactions
    .filter((item) => item.amount < 0)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount) || sortTransactionsByDateDesc(a, b))
    .slice(0, 10);
  els.recentTransactions.innerHTML = rows.length ? rows.map((item, index) => topExpenseRow(item, index + 1)).join("") : emptyState();
  els.recentTransactions.querySelectorAll("[data-expense-search]").forEach((button) => {
    button.addEventListener("click", () => openExpenseTransaction(button.dataset.expenseSearch));
  });
}

function renderTransactions() {
  updateMobileTransactionsBackButton();
  const query = els.searchInput.value.toLowerCase();
  const category = els.categoryFilter.value;
  const type = els.typeFilter.value;
  const sort = els.transactionSortSelect.value || "date_desc";
  const startDate = els.transactionStartDate.value;
  const endDate = els.transactionEndDate.value;
  const startBoundary = startDate ? parseLocalDate(startDate) : null;
  const endBoundary = endDate ? endOfLocalDay(parseLocalDate(endDate)) : null;
  const pageSize = isMobileLayout() ? 10 : Number(els.pageSizeSelect.value || 25);
  let rows = [...state.transactions];
  const duplicateKeys = type === "duplicates" ? duplicateTransactionKeys(rows) : new Set();

  if (query) {
    rows = rows.filter((item) => `${item.merchant} ${item.description} ${item.bank}`.toLowerCase().includes(query));
  }
  if (category !== "all") rows = rows.filter((item) => item.category === category);
  if (startBoundary) rows = rows.filter((item) => parseLocalDate(item.date) >= startBoundary);
  if (endBoundary) rows = rows.filter((item) => parseLocalDate(item.date) <= endBoundary);
  if (type === "needs_action") rows = rows.filter((item) => item.confidence < 0.6 || item.category === "Uncategorised");
  if (type === "uncategorised") rows = rows.filter((item) => item.category === "Uncategorised");
  if (type === "review") rows = rows.filter((item) => item.confidence < 0.6);
  if (type === "income") rows = rows.filter((item) => item.amount > 0);
  if (type === "expense") rows = rows.filter((item) => item.amount < 0);
  if (type === "refunds") rows = rows.filter((item) => item.category === "Refunds / Reimbursements" || item.amount > 0 && /refund|cashback|reimburse/i.test(`${item.category} ${item.description}`));
  if (type === "duplicates") rows = rows.filter((item) => duplicateKeys.has(transactionLooseDedupeKey(item)));
  if (activeMacroFilter) rows = rows.filter((item) => macroCategory(item.category) === activeMacroFilter);
  rows = sortTransactionRows(rows, sort);

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  transactionPage = Math.min(Math.max(1, transactionPage), totalPages);
  const start = (transactionPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  els.transactionCountLabel.textContent = totalRows
    ? tr("showingRows")(start + 1, Math.min(start + pageSize, totalRows), totalRows)
    : tr("zeroTransactions");
  els.pageLabel.textContent = tr("page")(transactionPage, totalPages);
  els.prevPageButton.disabled = transactionPage <= 1;
  els.nextPageButton.disabled = transactionPage >= totalPages;

  els.transactionTable.innerHTML = pageRows.length ? pageRows.map(transactionRow).join("") : `<tr><td colspan="7">${emptyState()}</td></tr>`;
  if (els.mobileTransactionList) {
    els.mobileTransactionList.innerHTML = pageRows.length ? pageRows.map(mobileTransactionItem).join("") : emptyState();
    els.mobileTransactionList.querySelectorAll("[data-mobile-transaction]").forEach((button) => {
      button.addEventListener("click", () => openTransactionSheet(button.dataset.mobileTransaction));
    });
  }
  els.transactionTable.querySelectorAll("select[data-id]").forEach((select) => {
    select.addEventListener("change", () => updateTransactionCategory(select.dataset.id, select.value));
  });
  els.transactionTable.querySelectorAll("input[data-field]").forEach((input) => {
    input.addEventListener("change", () => updateTransactionField(input.dataset.id, input.dataset.field, input.value));
  });
  els.transactionTable.querySelectorAll("button[data-action='refund']").forEach((button) => {
    button.addEventListener("click", () => markTransactionAsRefund(button.dataset.id));
  });
  els.transactionTable.querySelectorAll("button[data-action='confirm']").forEach((button) => {
    button.addEventListener("click", () => confirmTransaction(button.dataset.id));
  });
  els.transactionTable.querySelectorAll("button[data-action='delete']").forEach((button) => {
    button.addEventListener("click", () => deleteTransaction(button.dataset.id));
  });
}

function mobileTransactionItem(item) {
  const date = parseLocalDate(item.date);
  const shortDate = new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-GB", { month: "2-digit", day: "2-digit" }).format(date);
  const amountClass = item.amount >= 0 ? "amount-income" : "amount-expense";
  return `
    <button class="mobile-transaction-item" type="button" data-mobile-transaction="${item.id}" style="--bar-color:${categoryColor(item.category)}">
      <span class="mobile-category-dot">${categoryInitial(item.category)}</span>
      <span class="mobile-transaction-copy">
        <strong>${escapeHtml(item.merchant || item.description || tr("unknown"))}</strong>
        <small>${escapeHtml(shortDate)} · ${escapeHtml(categoryDisplayLabel(item.category))}</small>
      </span>
      <span class="mobile-transaction-amount ${amountClass}">${money(item.amount)}</span>
    </button>
  `;
}

function categoryInitial(category) {
  const display = categoryDisplayLabel(category);
  return String(display || "?").trim().slice(0, 1).toUpperCase();
}

function openTransactionFilters() {
  const toolbar = document.querySelector("#transactionsView .toolbar");
  if (!toolbar) return;
  toolbar.classList.add("open");
  if (els.transactionFilterBackdrop) els.transactionFilterBackdrop.classList.add("open");
  document.body.classList.add("mobile-filter-open");
}

function closeTransactionFilters() {
  const toolbar = document.querySelector("#transactionsView .toolbar");
  if (!toolbar) return;
  toolbar.classList.remove("open");
  if (els.transactionFilterBackdrop) els.transactionFilterBackdrop.classList.remove("open");
  document.body.classList.remove("mobile-filter-open");
}

function updateMobileTransactionsBackButton() {
  if (!els.mobileTransactionsBackButton) return;
  const shouldShow = currentView === "transactions" && Boolean(transactionReturnView);
  els.mobileTransactionsBackButton.classList.toggle("hidden", !shouldShow);
  const label = transactionReturnView === "analytics" ? tr("pageTitles.analytics") : tr("pageTitles.dashboard");
  els.mobileTransactionsBackButton.innerHTML = `&lsaquo; ${label}`;
}

function returnFromTransactionDrilldown() {
  const target = transactionReturnView || "dashboard";
  transactionReturnView = null;
  setView(target);
}

function resetTransactionPageAndRender() {
  transactionPage = 1;
  renderTransactions();
}

function clearMacroAndRenderTransactions() {
  activeMacroFilter = null;
  resetTransactionPageAndRender();
}

function applyCurrentPeriodDateFilter() {
  const range = getPeriodRange(els.periodSelect.value, periodAnchor);
  els.transactionStartDate.value = toDateInputValue(range.start);
  els.transactionEndDate.value = toDateInputValue(range.end);
  resetTransactionPageAndRender();
}

function clearTransactionDateFilter() {
  els.transactionStartDate.value = "";
  els.transactionEndDate.value = "";
  resetTransactionPageAndRender();
}

function showDuplicateTransactions() {
  activeMacroFilter = null;
  els.typeFilter.value = "duplicates";
  els.transactionSortSelect.value = "amount_abs_desc";
  resetTransactionPageAndRender();
}

function bindCategoryDrilldowns(container) {
  container.querySelectorAll("[data-category-drilldown]").forEach((button) => {
    button.addEventListener("click", () => openCategoryTransactions(button.dataset.categoryDrilldown));
  });
}

function openCategoryTransactions(category) {
  const range = getPeriodRange(els.periodSelect.value, periodAnchor);
  activeMacroFilter = null;
  els.categoryFilter.value = category;
  els.typeFilter.value = "expense";
  els.transactionStartDate.value = toDateInputValue(range.start);
  els.transactionEndDate.value = toDateInputValue(range.end);
  transactionPage = 1;
  transactionReturnView = currentView === "analytics" ? "analytics" : "dashboard";
  setView("transactions");
}

function openDashboardTransactions(kind, value = "") {
  const range = getPeriodRange(els.periodSelect.value, periodAnchor);
  activeMacroFilter = null;
  els.searchInput.value = "";
  els.categoryFilter.value = "all";
  els.typeFilter.value = "all";
  els.transactionStartDate.value = toDateInputValue(range.start);
  els.transactionEndDate.value = toDateInputValue(range.end);

  if (kind === "income") {
    els.typeFilter.value = "income";
  } else if (kind === "expense") {
    els.typeFilter.value = "expense";
  } else if (kind === "review") {
    els.typeFilter.value = "review";
  } else if (kind === "merchant" && value) {
    els.typeFilter.value = "expense";
    els.searchInput.value = value;
  }

  transactionPage = 1;
  transactionReturnView = "dashboard";
  setView("transactions");
}

function openExpenseTransaction(query) {
  const range = getPeriodRange(els.periodSelect.value, periodAnchor);
  activeMacroFilter = null;
  els.searchInput.value = query;
  els.categoryFilter.value = "all";
  els.typeFilter.value = "expense";
  els.transactionStartDate.value = toDateInputValue(range.start);
  els.transactionEndDate.value = toDateInputValue(range.end);
  transactionPage = 1;
  transactionReturnView = "dashboard";
  setView("transactions");
}

function renderAnalytics() {
  const period = els.periodSelect.value;
  const fullRange = getPeriodRange(period, periodAnchor);
  const range = clampRangeToToday(fullRange);
  const previousRange = shiftRange(range, -1);
  const reportTransactions = reportingTransactions(state.transactions);
  const scoped = transactionsInRange(reportTransactions, range);
  const previous = transactionsInRange(reportTransactions, previousRange);
  const grouped = fillPeriodPoints(scoped, analysisGrain, range);
  drawChart(els.analysisChart, grouped, { mode: "cashflow" });
  const names = tr("analysisNames");
  els.analysisTitle.textContent = names[analysisGrain];
  els.analysisRange.textContent = `${formatRange(range)} · ${tr("pointCount")(grouped.length, displayPeriodName(analysisGrain))}`;

  const income = sum(scoped.filter((item) => item.amount > 0), "amount");
  const expense = Math.abs(sum(scoped.filter((item) => item.amount < 0), "amount"));
  const previousIncome = sum(previous.filter((item) => item.amount > 0), "amount");
  const previousExpense = Math.abs(sum(previous.filter((item) => item.amount < 0), "amount"));
  const peak = [...grouped].sort((a, b) => b.expense - a.expense)[0];
  const average = grouped.length ? grouped.reduce((acc, item) => acc + item.expense, 0) / grouped.length : 0;

  els.analysisIncomeMetric.textContent = money(income);
  els.analysisExpenseMetric.textContent = money(expense);
  els.analysisPeakMetric.textContent = money(peak?.expense || 0);
  els.analysisAverageMetric.textContent = money(average);
  els.analysisIncomeDelta.textContent = deltaText(income, previousIncome);
  els.analysisExpenseDelta.textContent = deltaText(expense, previousExpense);
  els.analysisPeakLabel.textContent = peak?.label ? tr("peakSpend")(displayPeriodName(analysisGrain), peak.label) : tr("waiting");
  els.analysisAverageLabel.textContent = `${formatRange(range)} · ${tr("averageBy")(displayPeriodName(analysisGrain))}`;

  const expenses = scoped.filter((item) => item.amount < 0);
  const merchants = groupTotals(expenses, (item) => item.merchant, true).slice(0, 8);
  els.merchantRanking.innerHTML = merchants.length ? merchants.map((item, index) => rankRow(index + 1, item.label, item.total)).join("") : emptyState();

  const categoryTotals = groupTotals(expenses, (item) => item.category, true).slice(0, 8);
  const max = categoryTotals[0]?.total || 0;
  els.budgetPressure.innerHTML = categoryTotals.length ? categoryTotals.map((item) => barRow(item.label, item.total, max)).join("") : emptyState();
  bindCategoryDrilldowns(els.budgetPressure);
  renderMacroCategories(expenses);
}

function renderRecurring() {
  const range = getPeriodRange(els.periodSelect.value, periodAnchor);
  const scoped = transactionsInRange(reportingTransactions(state.transactions), range);
  const recurring = detectRecurring(scoped);
  const incomes = recurring.filter((item) => item.amount > 0);
  const expenses = recurring.filter((item) => item.amount < 0);
  els.incomeRecurring.innerHTML = incomes.length ? incomes.map(recurringRow).join("") : emptyState();
  els.expenseRecurring.innerHTML = expenses.length ? expenses.map(recurringRow).join("") : emptyState();
  els.recurringTimeline.innerHTML = recurring.length
    ? recurring.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).map((item) => recurringDetailRow(item, range)).join("")
    : emptyState();
}

function renderRules() {
  const totalPages = Math.max(1, Math.ceil(state.rules.length / RULES_PER_PAGE));
  rulesPage = Math.min(Math.max(1, rulesPage), totalPages);
  const start = (rulesPage - 1) * RULES_PER_PAGE;
  const visibleRules = state.rules.slice(start, start + RULES_PER_PAGE);
  els.ruleCount.textContent = `${tr("rulesCount")(state.rules.length)} · ${rulesPage}/${totalPages}`;
  els.rulesList.innerHTML = `
    <div class="rule-pager">
      <button class="button ghost compact" type="button" data-rule-page="prev" ${rulesPage <= 1 ? "disabled" : ""}>${tr("previous")}</button>
      <span>${start + 1}-${Math.min(start + RULES_PER_PAGE, state.rules.length)} / ${state.rules.length}</span>
      <button class="button ghost compact" type="button" data-rule-page="next" ${rulesPage >= totalPages ? "disabled" : ""}>${tr("next")}</button>
    </div>
    ${visibleRules.map((rule) => `
    <div class="rule-row">
      <input value="${escapeHtml(rule.keyword)}" data-rule-keyword="${rule.id}" aria-label="Rule keyword" />
      ${ruleCategorySelect(rule.id, rule.category)}
      <button class="tile-delete" type="button" data-rule="${rule.id}" aria-label="${tr("delete")}">×</button>
    </div>
  `).join("")}
  `;
  els.rulesList.querySelectorAll("[data-rule-page]").forEach((button) => {
    button.addEventListener("click", () => {
      rulesPage += button.dataset.rulePage === "next" ? 1 : -1;
      renderRules();
    });
  });
  els.rulesList.querySelectorAll("input[data-rule-keyword]").forEach((input) => {
    input.addEventListener("change", () => updateRuleKeyword(input.dataset.ruleKeyword, input.value));
  });
  els.rulesList.querySelectorAll("select[data-rule-category]").forEach((select) => {
    select.addEventListener("change", () => updateRuleCategory(select.dataset.ruleCategory, select.value));
  });
  els.rulesList.querySelectorAll("button[data-rule]").forEach((button) => {
    button.addEventListener("click", () => {
      state.rules = state.rules.filter((rule) => rule.id !== button.dataset.rule);
      persist();
      render();
    });
  });

  const customCategories = state.categories || [];
  els.customCategoriesList.innerHTML = customCategories.length ? customCategories.map((category) => `
    <div class="rule-row">
      <span><strong>${escapeHtml(category)}</strong></span>
      <button class="tile-delete" type="button" data-category="${escapeHtml(category)}" aria-label="${tr("delete")}">×</button>
    </div>
  `).join("") : `<div class="empty-state"><span>${tr("noCustomCategories")}</span></div>`;
  els.customCategoriesList.querySelectorAll("button[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.category;
      const inUse = state.transactions.some((transaction) => transaction.category === category)
        || state.rules.some((rule) => rule.category === category);
      if (inUse) {
        alert(tr("categoryInUse"));
        return;
      }
      state.categories = state.categories.filter((item) => item !== category);
      hydrateControls();
      persist();
      render();
    });
  });
}

function ruleCategorySelect(id, value) {
  return `<select data-rule-category="${id}" aria-label="Rule category">${getCategories().map((category) => `<option value="${category}" ${category === value ? "selected" : ""}>${categoryDisplayLabel(category)}</option>`).join("")}</select>`;
}

function updateRuleKeyword(id, keyword) {
  const rule = state.rules.find((item) => item.id === id);
  if (!rule) return;
  rule.keyword = keyword.trim();
  if (!rule.keyword) {
    state.rules = state.rules.filter((item) => item.id !== id);
  }
  persist();
  render();
}

function updateRuleCategory(id, category) {
  const rule = state.rules.find((item) => item.id === id);
  if (!rule) return;
  rule.category = category;
  persist();
  render();
}

function renderPendingImportReview() {
  if (!pendingImport) return;
  const selectedCount = pendingImport.items.filter((item) => item.selected && !item.duplicate).length;
  const duplicateCount = pendingImport.items.filter((item) => item.duplicate).length;
  els.importSummary.textContent = tr("foundImport")(pendingImport.items.length, selectedCount, duplicateCount);

  const rows = pendingImport.items.map(importReviewRow).join("");
  const unsupportedRows = pendingImport.unsupported.map((name) => `<div class="compact-row"><span>${escapeHtml(name)}</span><span class="compact-meta">${tr("unsupportedFile")}</span></div>`).join("");
  const failedRows = pendingImport.failed.map(importIssueRow).join("");
  const reviewTable = rows ? `
    <div class="import-review-actions">
      <div>
        <strong>${tr("reviewBeforeImport")}</strong>
        <span class="compact-meta">${tr("duplicateHelp")}</span>
      </div>
      <div class="row-actions">
        <button type="button" data-import-action="select-all">${tr("selectAllImportable")}</button>
        <button type="button" data-import-action="clear-all">${tr("clearAll")}</button>
        <button type="button" data-import-action="cancel">${tr("cancelBatch")}</button>
        <button class="button primary" type="button" data-import-action="confirm">${tr("confirmImport")(selectedCount)}</button>
      </div>
    </div>
    <div class="import-review-table">
      <table>
        <thead>
          <tr>
            <th>${tr("importColumn")}</th>
            ${tr("tableHeads").map((head) => `<th>${head}</th>`).join("")}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  ` : "";

  els.importPreview.innerHTML = reviewTable || unsupportedRows || failedRows ? reviewTable + unsupportedRows + failedRows : emptyState();
  bindImportReviewEvents();
}

function importIssueRow(issue) {
  const normalized = typeof issue === "string" ? { name: issue, message: tr("noImportRows"), detail: "" } : issue;
  const detail = normalized.detail
    ? `<div class="ocr-preview"><strong>${tr("ocrPreview")}</strong><span>${escapeHtml(normalized.detail)}</span></div>`
    : "";
  return `
    <div class="import-issue-row">
      <div>
        <strong>${escapeHtml(normalized.name || tr("importFile"))}</strong>
        <span class="compact-meta">${escapeHtml(normalized.message || tr("noImportRows"))}</span>
        ${detail}
      </div>
      <span class="compact-meta">${tr("uploadVisibleTable")}</span>
    </div>
  `;
}

function importReviewRow(item) {
  const dateValue = parseDate(item.date) || item.date;
  return `
    <tr class="${item.duplicate ? "duplicate-row" : ""}">
      <td data-label="${tr("importColumn")}"><input type="checkbox" data-pending-select="${item.pendingId}" ${item.selected && !item.duplicate ? "checked" : ""} ${item.duplicate ? "disabled" : ""} /></td>
      <td data-label="${tr("tableHeads")[0]}"><input class="table-input date-input" type="date" data-pending-field="date" data-pending-id="${item.pendingId}" value="${escapeHtml(dateValue)}" /></td>
      <td data-label="${tr("tableHeads")[1]}">
        <input class="table-input merchant-input" data-pending-field="merchant" data-pending-id="${item.pendingId}" value="${escapeHtml(item.merchant)}" />
        <input class="table-input description-input" data-pending-field="description" data-pending-id="${item.pendingId}" value="${escapeHtml(item.description)}" />
      </td>
      <td data-label="${tr("tableHeads")[2]}">${escapeHtml(item.bank || "Bank Account")}</td>
      <td data-label="${tr("tableHeads")[3]}">${pendingCategorySelect(item.pendingId, item.category)}</td>
      <td data-label="${tr("tableHeads")[4]}"><input class="table-input amount-input ${item.amount >= 0 ? "amount-income" : "amount-expense"}" type="number" step="0.01" data-pending-field="amount" data-pending-id="${item.pendingId}" value="${Number(item.amount || 0).toFixed(2)}" /></td>
      <td data-label="${tr("tableHeads")[5]}"><span class="status ${item.duplicate ? "review" : "ok"}">${item.duplicate ? item.duplicateReason : tr("ready")}</span></td>
      <td data-label="${tr("tableHeads")[6]}"><button type="button" data-pending-remove="${item.pendingId}">${tr("delete")}</button></td>
    </tr>
  `;
}

function pendingCategorySelect(id, value) {
  return `<select data-pending-field="category" data-pending-id="${id}">${getCategories().map((category) => `<option value="${category}" ${category === value ? "selected" : ""}>${categoryDisplayLabel(category)}</option>`).join("")}</select>`;
}

function bindImportReviewEvents() {
  els.importPreview.querySelectorAll("[data-pending-select]").forEach((input) => {
    input.addEventListener("change", () => updatePendingImportSelection(input.dataset.pendingSelect, input.checked));
  });
  els.importPreview.querySelectorAll("[data-pending-field]").forEach((input) => {
    input.addEventListener("change", () => updatePendingImportField(input.dataset.pendingId, input.dataset.pendingField, input.value));
  });
  els.importPreview.querySelectorAll("[data-pending-remove]").forEach((button) => {
    button.addEventListener("click", () => removePendingImportItem(button.dataset.pendingRemove));
  });
  els.importPreview.querySelectorAll("[data-import-action]").forEach((button) => {
    button.addEventListener("click", () => handleImportReviewAction(button.dataset.importAction));
  });
}

function updatePendingImportSelection(id, selected) {
  const item = pendingImport?.items.find((candidate) => candidate.pendingId === id);
  if (!item || item.duplicate) return;
  item.selected = selected;
  renderPendingImportReview();
}

function updatePendingImportField(id, field, value) {
  const item = pendingImport?.items.find((candidate) => candidate.pendingId === id);
  if (!item) return;
  if (field === "amount") {
    const amount = parseMoney(value);
    if (!Number.isFinite(amount)) return;
    item.amount = roundMoney(amount);
  } else if (field === "date") {
    const date = parseDate(value);
    if (!date) return;
    item.date = date;
  } else if (field === "merchant" || field === "description") {
    item[field] = cleanOcrMerchantNoise(value);
    if (field === "merchant") item.description = item.description || item.merchant;
  } else if (field === "category") {
    item.category = value;
    if (isPositiveCategory(value)) item.amount = Math.abs(item.amount);
    item.confidence = 1;
  }
  refreshPendingImportDuplicates();
  renderPendingImportReview();
}

function removePendingImportItem(id) {
  if (!pendingImport) return;
  pendingImport.items = pendingImport.items.filter((item) => item.pendingId !== id);
  refreshPendingImportDuplicates();
  renderPendingImportReview();
}

function handleImportReviewAction(action) {
  if (!pendingImport) return;
  if (action === "select-all") {
    pendingImport.items.forEach((item) => {
      if (!item.duplicate) item.selected = true;
    });
    renderPendingImportReview();
  } else if (action === "clear-all") {
    pendingImport.items.forEach((item) => {
      item.selected = false;
    });
    renderPendingImportReview();
  } else if (action === "cancel") {
    pendingImport = null;
    els.importSummary.textContent = tr("importBatchCancelled");
    els.importPreview.innerHTML = emptyState();
  } else if (action === "confirm") {
    confirmPendingImport();
  }
}

function confirmPendingImport() {
  if (!pendingImport) return;
  const selected = pendingImport.items.filter((item) => item.selected && !item.duplicate);
  if (!selected.length) {
    alert(tr("noTransactionsSelected"));
    return;
  }
  const imported = selected.map(({ pendingId, selected: _selected, duplicate, duplicateReason, ...transaction }) => tagImportBatch(transaction, pendingImport.batchId, pendingImport.importedAt));
  const before = state.transactions.length;
  state.transactions = dedupeTransactions([...imported, ...state.transactions]);
  const added = state.transactions.length - before;
  state.importLog.unshift({ name: tr("manualReviewedImport"), count: added, date: pendingImport.importedAt, status: "confirmed", batchId: pendingImport.batchId });
  persist();
  const completed = pendingImport;
  pendingImport = null;
  els.importSummary.textContent = tr("importDone")(added, Math.max(imported.length - added, 0));
  renderImportPreview(imported, completed.unsupported, completed.failed, completed.batchId, added);
  render();
}

function renderMacroCategories(expenses) {
  if (!els.macroCategoryBars || !els.macroPieChart) return;
  const grouped = groupTotals(expenses, (item) => macroCategory(item.category), true);
  const sorted = grouped.sort((a, b) => b.total - a.total);
  const total = sorted.reduce((acc, item) => acc + item.total, 0);
  const max = sorted[0]?.total || 0;
  els.macroCategoryTotal.textContent = money(total);
  els.macroCategoryBars.innerHTML = sorted.length ? sorted.map((item) => macroBarRow(item.label, item.total, max, total)).join("") : emptyState();
  drawPieChart(els.macroPieChart, sorted);
  els.macroCategoryBars.querySelectorAll("[data-macro-drilldown]").forEach((button) => {
    button.addEventListener("click", () => openMacroTransactions(button.dataset.macroDrilldown));
  });
}

function openMacroTransactions(label) {
  const range = getPeriodRange(els.periodSelect.value, periodAnchor);
  activeMacroFilter = label;
  els.searchInput.value = "";
  els.categoryFilter.value = "all";
  els.typeFilter.value = "expense";
  els.transactionStartDate.value = toDateInputValue(range.start);
  els.transactionEndDate.value = toDateInputValue(range.end);
  transactionPage = 1;
  transactionReturnView = "analytics";
  setView("transactions");
}

function macroCategory(category) {
  const value = String(category || "");
  if (/Eating Out|Takeaway|Delivery/i.test(value)) return "Food";
  if (/Shopping|Healthcare|Cash/i.test(value)) return "Shopping / Essentials";
  if (/Groceries/i.test(value)) return "Groceries";
  if (/Travel|Transport|Entertainment|Sports/i.test(value)) return "Leisure / Travel";
  if (/Council Tax|水电煤网|Subscriptions|Rent|Mortgage/i.test(value)) return "Fixed bills";
  if (/Savings|Investment|Transfer/i.test(value)) return "Transfers / Investments";
  if (/Refund|Income|工资|收入/i.test(value)) return "Income / Refunds";
  return "Other";
}

function macroBarRow(label, value, max, total) {
  const percent = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  const share = total > 0 ? `${((value / total) * 100).toFixed(1)}%` : "0%";
  const displayLabel = labelText("macroLabels", label);
  return `
    <button class="bar-row category-drilldown" type="button" data-macro-drilldown="${escapeHtml(label)}" style="--bar-color:${categoryColor(label)}">
      <div class="bar-top"><strong>${escapeHtml(displayLabel)}</strong><span>${money(value)} · ${share}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${percent}%"></div></div>
    </button>
  `;
}

function drawPieChart(canvas, data) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  const total = data.reduce((acc, item) => acc + item.total, 0);
  if (!total) {
    ctx.fillStyle = "#68736f";
    ctx.textAlign = "center";
    ctx.fillText(tr("noData"), width / 2, height / 2);
    return;
  }
  const colors = ["#0f766e", "#b45309", "#3267c9", "#15803d", "#b91c1c", "#7c3aed", "#64748b"];
  const radius = Math.min(width, height) / 2 - 12;
  const centerX = width / 2;
  const centerY = height / 2;
  let start = -Math.PI / 2;
  data.forEach((item, index) => {
    const angle = (item.total / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();
    start += angle;
  });
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.58, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.fillStyle = "#18211f";
  ctx.font = "700 18px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(money(total), centerX, centerY + 6);
}

function renderImportPreview(imported, unsupported, failed = [], batchId = "", added = imported.length) {
  const supportedRows = imported.slice(0, 8).map(compactTransaction).join("");
  const unsupportedRows = unsupported.map((name) => `<div class="compact-row"><span>${escapeHtml(name)}</span><span class="compact-meta">${tr("unsupportedFile")}</span></div>`).join("");
  const failedRows = failed.map(importIssueRow).join("");
  const undoRow = batchId && added > 0
    ? `<div class="import-batch-row"><span><strong>${tr("thisImportAdded")(added)}</strong><br><span class="compact-meta">${tr("undoImportHelp")}</span></span><button class="button danger" type="button" data-undo-batch="${batchId}">${tr("undoThisImport")}</button></div>`
    : "";
  els.importPreview.innerHTML = supportedRows || unsupportedRows || failedRows || undoRow ? undoRow + supportedRows + unsupportedRows + failedRows : emptyState();
  els.importPreview.querySelectorAll("button[data-undo-batch]").forEach((button) => {
    button.addEventListener("click", () => undoImportBatch(button.dataset.undoBatch));
  });
}

function undoImportBatch(batchId) {
  const count = state.transactions.filter((item) => item.importBatchId === batchId).length;
  if (!count) {
    alert(tr("noTransactionsForImport"));
    return;
  }
  if (!confirm(tr("deleteImportConfirm")(count))) return;
  state.transactions = state.transactions.filter((item) => item.importBatchId !== batchId);
  state.importLog = state.importLog.filter((item) => item.batchId !== batchId);
  persist();
  els.importSummary.textContent = tr("importUndone")(count);
  els.importPreview.innerHTML = emptyState();
  render();
}

function transactionRow(item) {
  const dateValue = parseDate(item.date) || item.date;
  return `
    <tr>
      <td data-label="${tr("tableHeads")[0]}"><input class="table-input date-input" type="date" data-id="${item.id}" data-field="date" value="${escapeHtml(dateValue)}" /></td>
      <td data-label="${tr("tableHeads")[1]}">
        <input class="table-input merchant-input" data-id="${item.id}" data-field="merchant" value="${escapeHtml(item.merchant)}" />
        <input class="table-input description-input" data-id="${item.id}" data-field="description" value="${escapeHtml(item.description)}" />
      </td>
      <td data-label="${tr("tableHeads")[2]}">${escapeHtml(item.bank)}</td>
      <td data-label="${tr("tableHeads")[3]}">${categorySelect(item.id, item.category)}</td>
      <td data-label="${tr("tableHeads")[4]}"><input class="table-input amount-input ${item.amount >= 0 ? "amount-income" : "amount-expense"}" type="number" step="0.01" data-id="${item.id}" data-field="amount" value="${item.amount.toFixed(2)}" /></td>
      <td data-label="${tr("tableHeads")[5]}"><span class="status ${item.confidence < 0.6 ? "review" : "ok"}">${item.confidence < 0.6 ? tr("review") : tr("categorised")}</span></td>
      <td data-label="${tr("tableHeads")[6]}">
        <div class="row-actions">
          ${item.confidence < 0.6 ? `<button type="button" data-action="confirm" data-id="${item.id}" title="${tr("confirmTransaction")}">${tr("confirm")}</button>` : ""}
          <button type="button" data-action="refund" data-id="${item.id}" title="${tr("markAsRefund")}">${tr("refund")}</button>
          <button type="button" data-action="delete" data-id="${item.id}" title="${tr("deleteTransaction")}">${tr("delete")}</button>
        </div>
      </td>
    </tr>
  `;
}

function categorySelect(id, value) {
  return `<select data-id="${id}">${getCategories().map((category) => `<option value="${category}" ${category === value ? "selected" : ""}>${categoryDisplayLabel(category)}</option>`).join("")}</select>`;
}

function fillSheetCategory(value) {
  if (!els.sheetCategory) return;
  els.sheetCategory.innerHTML = getCategories().map((category) => `<option value="${category}" ${category === value ? "selected" : ""}>${categoryDisplayLabel(category)}</option>`).join("");
}

function openTransactionSheet(id) {
  const transaction = state.transactions.find((item) => item.id === id);
  if (!transaction || !els.transactionSheet) return;
  sheetTransactionId = id;
  els.sheetMerchant.textContent = transaction.merchant || transaction.description || tr("unknown");
  els.sheetMeta.textContent = `${transaction.date} · ${categoryDisplayLabel(transaction.category)}`;
  els.sheetOrb.textContent = categoryInitial(transaction.category);
  els.sheetOrb.style.setProperty("--bar-color", categoryColor(transaction.category));
  els.sheetDate.value = parseDate(transaction.date) || transaction.date;
  els.sheetAmount.value = Number(transaction.amount || 0).toFixed(2);
  els.sheetMerchantInput.value = transaction.merchant || "";
  els.sheetDescription.value = transaction.description || "";
  fillSheetCategory(transaction.category);
  els.transactionSheet.classList.remove("hidden");
  els.transactionSheet.setAttribute("aria-hidden", "false");
}

function closeTransactionSheet() {
  sheetTransactionId = null;
  if (!els.transactionSheet) return;
  els.transactionSheet.classList.add("hidden");
  els.transactionSheet.setAttribute("aria-hidden", "true");
}

function saveTransactionSheet() {
  if (!sheetTransactionId) return;
  updateTransactionField(sheetTransactionId, "date", els.sheetDate.value);
  updateTransactionField(sheetTransactionId, "amount", els.sheetAmount.value);
  updateTransactionField(sheetTransactionId, "merchant", els.sheetMerchantInput.value);
  updateTransactionField(sheetTransactionId, "description", els.sheetDescription.value);
  updateTransactionCategory(sheetTransactionId, els.sheetCategory.value);
  closeTransactionSheet();
}

function updateTransactionCategory(id, category) {
  const transaction = state.transactions.find((item) => item.id === id);
  if (!transaction) return;
  transaction.category = category;
  if (isPositiveCategory(category)) {
    transaction.amount = Math.abs(transaction.amount);
  }
  transaction.confidence = 1;
  transaction.edited = true;
  if (transaction.merchant && !state.rules.some((rule) => rule.keyword.toLowerCase() === transaction.merchant.toLowerCase())) {
    state.rules.unshift({ id: crypto.randomUUID(), keyword: transaction.merchant, category, source: "learned" });
  }
  persist();
  render();
}

function updateTransactionField(id, field, value) {
  const transaction = state.transactions.find((item) => item.id === id);
  if (!transaction) return;
  if (field === "amount") {
    const amount = parseMoney(value);
    if (!Number.isFinite(amount)) return;
    transaction.amount = roundMoney(amount);
    if (isPositiveCategory(transaction.category)) {
      transaction.amount = Math.abs(transaction.amount);
    } else if (transaction.amount > 0 && transaction.category === "Shopping") {
      transaction.category = "Refunds / Reimbursements";
    }
  } else if (field === "date") {
    const date = parseDate(value);
    if (!date) return;
    transaction.date = date;
  } else if (field === "merchant" || field === "description") {
    transaction[field] = cleanOcrMerchantNoise(value);
    if (field === "merchant") transaction.description = transaction.description || transaction.merchant;
  }
  transaction.confidence = 1;
  transaction.edited = true;
  persist();
  render();
}

function markTransactionAsRefund(id) {
  const transaction = state.transactions.find((item) => item.id === id);
  if (!transaction) return;
  transaction.amount = Math.abs(transaction.amount);
  transaction.category = "Refunds / Reimbursements";
  transaction.confidence = 1;
  transaction.edited = true;
  persist();
  render();
}

function confirmTransaction(id) {
  const transaction = state.transactions.find((item) => item.id === id);
  if (!transaction) return;
  transaction.confidence = 1;
  transaction.edited = true;
  persist();
  render();
}

function deleteTransaction(id) {
  if (!confirm(tr("deleteTransactionConfirm"))) return;
  state.transactions = state.transactions.filter((item) => item.id !== id);
  persist();
  render();
}

function fillCategorySelect(select, includeAll) {
  select.innerHTML = `${includeAll ? `<option value="all">${tr("allCategories")}</option>` : ""}${getCategories().map((category) => `<option value="${category}">${categoryDisplayLabel(category)}</option>`).join("")}`;
}

function getPeriodRange(period, anchor) {
  const date = new Date(anchor);
  let start;
  let end;
  if (period === "day") {
    start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  } else if (period === "week") {
    const day = date.getDay() || 7;
    start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - day + 1);
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
  } else if (period === "month") {
    start = new Date(date.getFullYear(), date.getMonth(), 1);
    end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  } else {
    start = new Date(date.getFullYear(), 0, 1);
    end = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
  }
  return { start, end, period };
}

function shiftRange(range, direction) {
  return getPeriodRange(range.period, addPeriod(range.start, range.period, direction));
}

function addPeriod(date, period, direction) {
  const next = new Date(date);
  if (period === "day") next.setDate(next.getDate() + direction);
  else if (period === "week") next.setDate(next.getDate() + direction * 7);
  else if (period === "month") next.setMonth(next.getMonth() + direction);
  else next.setFullYear(next.getFullYear() + direction);
  return next;
}

function getChartWindowRange(period, range) {
  if (period === "day") return range;
  if (period === "week") return range;
  if (period === "month") return range;
  return range;
}

function averageGrainForPeriod(period) {
  if (period === "year") return "month";
  if (period === "month") return "week";
  if (period === "week") return "day";
  return "day";
}

function fillPeriodPoints(transactions, grain, range) {
  const map = new Map(groupByPeriod(transactions, grain).map((item) => [item.label, item]));
  const points = [];
  const cursor = new Date(range.start);
  const end = new Date(range.end);
  while (cursor <= end) {
    const label = periodKey(cursor, grain);
    if (!points.some((item) => item.label === label)) {
      points.push(map.get(label) || { label, income: 0, expense: 0, net: 0 });
    }
    if (grain === "day") cursor.setDate(cursor.getDate() + 1);
    else if (grain === "week") cursor.setDate(cursor.getDate() + 7);
    else if (grain === "month") cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setFullYear(cursor.getFullYear() + 1);
  }
  return points;
}

function parseLocalDate(value) {
  const normalised = parseDate(value);
  if (!normalised) return new Date(0);
  const [year, month, day] = normalised.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function endOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function clampRangeToToday(range) {
  const today = endOfLocalDay(new Date());
  if (range.start > today || range.end <= today) return range;
  return { ...range, end: today };
}

function sortTransactionsByDateDesc(a, b) {
  return parseLocalDate(b.date) - parseLocalDate(a.date);
}

function formatRange(range) {
  return `${formatDate(range.start)} - ${formatDate(range.end)}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatShortMonth(date) {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-GB", { month: "short" }).format(date);
}

function formatPeriodButtonLabel(period, range) {
  const start = range.start;
  const end = range.end;
  const year = start.getFullYear();
  const month = start.getMonth() + 1;
  if (period === "day") return `${start.getDate()} ${formatShortMonth(start)} ${year}`;
  if (period === "week") return `${start.getDate()} ${formatShortMonth(start)} - ${end.getDate()} ${formatShortMonth(end)}`;
  if (period === "month") return `${formatShortMonth(start)} ${year}`;
  return `${year}`;
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function periodName(period) {
  return language === "zh"
    ? ({ day: "日", week: "周", month: "月", year: "年" })[period] || "周期"
    : ({ day: "day", week: "week", month: "month", year: "year" })[period] || "period";
}

function displayPeriodName(period) {
  const name = periodName(period);
  return language === "zh" ? name : name.charAt(0).toUpperCase() + name.slice(1);
}

function shortPeriodLabel(label, grain, index = 0) {
  const value = String(label || "");
  if (grain === "week") return language === "zh" ? `第${index + 1}周` : `Week ${index + 1}`;
  if (grain === "month") return value.replace(/^(\d{4})-(\d{2})$/, "$1/$2");
  if (grain === "day") return value.slice(5);
  return value;
}

function groupByPeriod(transactions, grain) {
  const map = new Map();
  transactions.forEach((item) => {
    const date = parseLocalDate(item.date);
    const key = periodKey(date, grain);
    const current = map.get(key) || { label: key, income: 0, expense: 0, net: 0 };
    if (item.amount >= 0) current.income += item.amount;
    else current.expense += Math.abs(item.amount);
    current.net += item.amount;
    map.set(key, current);
  });
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function groupTotals(transactions, getLabel, absolute) {
  const map = new Map();
  transactions.forEach((item) => {
    const label = getLabel(item) || tr("unknown");
    const amount = absolute ? Math.abs(item.amount) : item.amount;
    map.set(label, (map.get(label) || 0) + amount);
  });
  return [...map.entries()].map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total);
}

function detectRecurring(transactions = state.transactions) {
  const groups = new Map();
  transactions.forEach((item) => {
    const key = `${item.merchant.toLowerCase()}|${Math.sign(item.amount)}|${item.category}`;
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  });
  return [...groups.values()]
    .filter((items) => items.length >= 2)
    .map((items) => {
      const sorted = items.sort((a, b) => a.date.localeCompare(b.date));
      const avg = sum(sorted, "amount") / sorted.length;
      return {
        merchant: sorted[0].merchant,
        category: sorted[0].category,
        amount: avg,
        day: Math.round(sorted.reduce((acc, item) => acc + new Date(item.date).getDate(), 0) / sorted.length),
        count: sorted.length
      };
    })
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}

function drawChart(canvas, points, options = {}) {
  if (!canvas) return;
  const visible = canvas.offsetParent !== null || canvas.getClientRects().length > 0;
  if (!visible) return;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const parentRect = canvas.parentElement?.getBoundingClientRect();
  const fallbackWidth = Math.min(window.innerWidth - 48, 720);
  const width = Math.max(260, Math.round(rect.width || parentRect?.width || fallbackWidth));
  const height = isMobileLayout() ? 190 : Number(canvas.getAttribute("height"));
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = "100%";
  canvas.style.height = `${height}px`;
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);
  ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  canvas.animate?.([
    { transform: "translateY(8px)", opacity: 0.82 },
    { transform: "translateY(0)", opacity: 1 }
  ], { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });

  if (!points.length) {
    ctx.fillStyle = "#68736f";
    ctx.fillText(tr("chartEmpty"), 20, 40);
    chartState.set(canvas, []);
    return;
  }

  const pad = 42;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2 - 18;
  const max = Math.max(...points.flatMap((p) => [p.income, p.expense, Math.abs(p.net)]), 1);
  const slot = plotW / Math.max(points.length, 1);
  const barW = Math.max(6, Math.min(18, slot / 4));
  const hitboxes = [];

  ctx.strokeStyle = "#e8edf5";
  ctx.fillStyle = "#8b97a8";
  ctx.textAlign = "right";
  [0, 0.5, 1].forEach((ratio) => {
    const y = height - pad - ratio * plotH;
    ctx.globalAlpha = ratio === 0 ? 1 : 0.45;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad, y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillText(money(max * ratio), pad - 8, y + 4);
  });

  ctx.beginPath();
  ctx.moveTo(pad, height - pad);
  ctx.lineTo(width - pad, height - pad);
  ctx.stroke();
  ctx.textAlign = "left";

  points.forEach((point, index) => {
    const x = pad + slot * index + Math.max(4, (slot - barW * 3 - 6) / 2);
    const incomeH = (point.income / max) * plotH;
    const expenseH = (point.expense / max) * plotH;
    const netH = (Math.abs(point.net) / max) * plotH;
    drawRoundedGradientBar(ctx, x, height - pad - incomeH, barW, incomeH, "#16a34a", "#86efac");
    drawRoundedGradientBar(ctx, x + barW + 4, height - pad - expenseH, barW, expenseH, "#f97316", "#fdba74");
    drawRoundedGradientBar(ctx, x + (barW + 4) * 2, height - pad - netH, barW, netH, point.net >= 0 ? "#1d4ed8" : "#ef4444", point.net >= 0 ? "#93c5fd" : "#fca5a5");
    hitboxes.push({
      x: x - 6,
      y: height - pad - Math.max(incomeH, expenseH, netH) - 8,
      width: barW * 3 + 20,
      height: Math.max(incomeH, expenseH, netH) + 28,
      point
    });
    if (index % Math.max(1, Math.ceil(points.length / 7)) === 0) {
      ctx.fillStyle = "#68736f";
      ctx.textAlign = "center";
      ctx.fillText(point.label.slice(-5), x - 4, height - 10);
    }
  });
  chartState.set(canvas, hitboxes);
}

function drawRoundedGradientBar(ctx, x, y, width, height, from, to) {
  if (height <= 0) return;
  const radius = Math.min(width / 2, 8, height / 2);
  const gradient = ctx.createLinearGradient(0, y, 0, y + height);
  gradient.addColorStop(0, to);
  gradient.addColorStop(1, from);
  ctx.fillStyle = gradient;
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
    return;
  }
  ctx.fillRect(x, y, width, height);
}

function periodKey(date, grain) {
  if (grain === "day") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  if (grain === "week") return weekKey(date);
  if (grain === "month") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return String(date.getFullYear());
}

function bindChartTooltip(canvas, tooltip) {
  if (!canvas || !tooltip) return;
  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const item = (chartState.get(canvas) || []).find((box) => (
      x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height
    ));
    if (!item) {
      tooltip.classList.remove("visible");
      return;
    }
    tooltip.innerHTML = `
      <strong>${escapeHtml(item.point.label)}</strong>
      <span>${tr("income")} ${money(item.point.income)}</span>
      <span>${tr("expense")} ${money(item.point.expense)}</span>
      <span>${tr("netCashflow")} ${money(item.point.net)}</span>
    `;
    tooltip.style.left = `${Math.min(rect.width - 170, Math.max(8, x + 12))}px`;
    tooltip.style.top = `${Math.max(8, y - 76)}px`;
    tooltip.classList.add("visible");
  });
  canvas.addEventListener("mouseleave", () => tooltip.classList.remove("visible"));
}

function weekKey(date) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((copy - yearStart) / 86400000) + 1) / 7);
  return `${copy.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function barRow(label, value, max) {
  const percent = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  const displayLabel = categoryDisplayLabel(label);
  return `
    <button class="bar-row category-drilldown" type="button" data-category-drilldown="${escapeHtml(label)}" title="View ${escapeHtml(label)} details" style="--bar-color:${categoryColor(label)}">
      <div class="bar-top"><strong>${escapeHtml(displayLabel)}</strong><span>${money(value)}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${percent}%"></div></div>
    </button>
  `;
}

function categoryDisplayLabel(label) {
  return labelText("categoryLabels", label);
}

function categoryColor(label) {
  const text = String(label || "").toLowerCase();
  if (/shopping|购物|日用品/.test(text)) return "#f97316";
  if (/sport|运动|玩/.test(text)) return "#22c55e";
  if (/eat|takeaway|delivery|餐|Food/.test(text)) return "#fb7185";
  if (/grocer|超市|食品/.test(text)) return "#10b981";
  if (/travel|transport|出行|交通/.test(text)) return "#1d4ed8";
  if (/bill|council|rent|mortgage|水电|固定/.test(text)) return "#7c3aed";
  if (/refund|income|收入|退款/.test(text)) return "#059669";
  return "#0ea5e9";
}

function rankRow(index, label, total) {
  return `<div class="rank-row"><span>${index}. <strong>${escapeHtml(label)}</strong></span><span>${money(total)}</span></div>`;
}

function compactTransaction(item) {
  return `
    <div class="compact-row">
      <span><strong>${escapeHtml(item.merchant)}</strong><br><span class="compact-meta">${item.date} · ${escapeHtml(categoryDisplayLabel(item.category))}</span></span>
      <span class="${item.amount >= 0 ? "amount-income" : "amount-expense"}">${money(item.amount)}</span>
    </div>
  `;
}

function topExpenseRow(item, rank) {
  return `
    <button class="top-expense-row" type="button" data-expense-search="${escapeHtml(item.merchant)}">
      <span class="rank-badge">${rank}</span>
      <span>
        <strong>${escapeHtml(item.merchant)}</strong>
        <span class="compact-meta">${item.date} · ${escapeHtml(categoryDisplayLabel(item.category))}</span>
      </span>
      <span class="amount-expense">${money(Math.abs(item.amount))}</span>
    </button>
  `;
}

function recurringRow(item) {
  const meta = language === "zh"
    ? `${item.count}次 / 本周期 · 常见日期 ${item.day}`
    : `${item.count}x this period · usual day ${item.day}`;
  return `
    <div class="compact-row">
      <span><strong>${escapeHtml(item.merchant)}</strong><br><span class="compact-meta">${meta}</span></span>
      <span class="${item.amount >= 0 ? "amount-income" : "amount-expense"}">${money(item.amount)}</span>
    </div>
  `;
}

function recurringDetailRow(item, range) {
  return `
    <div class="timeline-row">
      <div class="timeline-day">${item.count}x</div>
      <div class="timeline-body">
        <strong>${escapeHtml(item.merchant)}</strong>
        <div class="compact-meta">${escapeHtml(categoryDisplayLabel(item.category))} · avg ${money(item.amount)} · ${formatRange(range)}</div>
      </div>
    </div>
  `;
}

function timelineRow(item) {
  return `
    <div class="timeline-row">
      <div class="timeline-day">${item.day}</div>
      <div class="timeline-body">
        <strong>${escapeHtml(item.merchant)}</strong>
        <div class="compact-meta">${escapeHtml(categoryDisplayLabel(item.category))} · ${money(item.amount)}</div>
      </div>
    </div>
  `;
}

function emptyState() {
  return document.getElementById("emptyStateTemplate").innerHTML;
}

function deltaText(current, previous) {
  if (!previous) return tr("previousComparison");
  const delta = ((current - previous) / previous) * 100;
  return `${language === "zh" ? "较上期 " : "vs previous "}${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
}

function sum(items, key) {
  return items.reduce((acc, item) => acc + Number(item[key] || 0), 0);
}

function money(value) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value || 0);
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function loadDemoData() {
  const today = new Date();
  const demo = [];
  const monthOffsets = [0, -1, -2, -3];
  const recurring = [
    [25, "ACME PAYROLL SALARY", 3200],
    [1, "London Rent", -1450],
    [3, "Council Tax Camden", -156],
    [7, "Octopus Energy", -92],
    [9, "EE Limited", -23],
    [12, "Netflix", -10.99],
    [15, "Spotify", -11.99],
    [18, "Vanguard ISA", -400]
  ];
  const variable = [
    [5, "TESCO STORES", -64.2],
    [8, "TFL Travel Charge", -38.5],
    [11, "Pret A Manger", -8.65],
    [14, "Sainsbury's", -52.15],
    [17, "Amazon Marketplace", -43.99],
    [21, "Deliveroo", -27.4],
    [23, "Boots UK", -18.7],
    [27, "Trainline", -31.8]
  ];

  monthOffsets.forEach((offset) => {
    const base = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    [...recurring, ...variable].forEach(([day, merchant, amount]) => {
      const date = new Date(base.getFullYear(), base.getMonth(), Math.min(day, 28));
      const classified = classify(merchant, amount);
      demo.push({
        id: crypto.randomUUID(),
        date: toDateInputValue(date),
        description: merchant,
        merchant,
        amount,
        currency: "GBP",
        bank: amount > 0 ? "HSBC" : "Monzo",
        account: amount > 0 ? "Current Account" : "Spending Account",
        category: classified.category,
        confidence: classified.confidence,
        balance: null,
        sourceFile: "demo.csv",
        importedAt: new Date().toISOString(),
        edited: false
      });
    });
  });

  state.transactions = dedupeTransactions([...demo, ...state.transactions]);
  persist();
  render();
}

function resetData() {
  if (!confirm("Clear local demo and imported data?")) return;
  state = { transactions: [], rules: defaultRules, categories: [], importLog: [] };
  persist();
  render();
}

