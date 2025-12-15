/**
 * Guideline Data
 *
 * Contains all 38 guidelines organized into 9 sections.
 * Each guideline includes: title, rule, explanation, examples, and audit relevance.
 */

export interface GuidelineExample {
  code: string;
  label?: string;
}

export interface Guideline {
  id: string;
  title: string;
  rule: string;
  explanation: string;
  examples: GuidelineExample[];
  auditRelevance: string;
}

export interface GuidelineSection {
  id: string;
  title: string;
  guidelines: Guideline[];
}

export const GUIDELINES: GuidelineSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    guidelines: [
      {
        id: 'gs-1',
        title: 'What is SolCalc?',
        rule: 'SolCalc is a mixed-decimal calculator that mimics Solidity\'s integer-only arithmetic with explicit decimal tracking.',
        explanation: 'Solidity does not have floating-point types. All token amounts are stored as integers with an implied decimal place. For example, 1 USDC (6 decimals) is stored as 1000000. SolCalc helps you verify calculations across different decimal precisions without manual conversion.',
        examples: [
          { code: '1000000 with 6 decimals → 1.0 USDC', label: 'USDC representation' },
          { code: '1000000000000000000 with 18 decimals → 1.0 ETH', label: 'ETH representation' },
        ],
        auditRelevance: 'Understanding fixed-point representation is fundamental to auditing DeFi protocols. Misunderstanding decimal places is a common source of critical vulnerabilities.',
      },
      {
        id: 'gs-2',
        title: 'Human-Readable Input',
        rule: 'When you enter a value like "2" with decimals "18", SolCalc automatically converts it to 2000000000000000000.',
        explanation: 'You don\'t need to type out the full integer representation. Enter the human-readable value (e.g., "2.5") and specify the decimal precision. SolCalc handles the conversion to the underlying integer.',
        examples: [
          { code: 'Input: value=2, decimals=18 → 2000000000000000000', label: 'Simple conversion' },
          { code: 'Input: value=1.5, decimals=6 → 1500000', label: 'USDC amount' },
        ],
        auditRelevance: 'This mirrors how users think about token amounts (human terms) vs. how contracts store them (integer terms). Auditors must verify conversions happen correctly.',
      },
      {
        id: 'gs-3',
        title: 'Variables vs. Literals',
        rule: 'Variables are defined explicitly with a value and decimal precision. Literals in expressions inherit decimals from context.',
        explanation: 'Variables like "x" require you to specify both value and decimals. Scalar literals (plain integers like "1" or "100") automatically adapt to match the decimal precision of other operands in addition/subtraction.',
        examples: [
          { code: 'x = 1000000000000000000 (18 decimals)\n1e18 + 1 → auto-lifts 1 to 18 decimals', label: 'Scalar auto-lifting' },
          { code: 'x + y requires x.decimals == y.decimals', label: 'Variable constraint' },
        ],
        auditRelevance: 'Incorrect decimal assumptions cause precision loss bugs. Verify that scalar constants are scaled correctly in contract code.',
      },
      {
        id: 'gs-4',
        title: 'Rounding Modes',
        rule: 'SolCalc supports Floor (round down) and Ceil (round up) rounding modes, matching Solidity\'s division behavior.',
        explanation: 'Solidity\'s native division always rounds down (floor). Many DeFi protocols implement custom ceil division for fair rounding. SolCalc shows both results and the precision loss.',
        examples: [
          { code: '7 / 2 (Floor) → 3, Loss: 0.5', label: 'Floor mode' },
          { code: '7 / 2 (Ceil) → 4, Loss: -0.5', label: 'Ceil mode' },
        ],
        auditRelevance: 'Rounding direction determines who loses value in divisions. Floor favors the protocol (user loses dust). Ceil favors the user (protocol loses dust). Verify which is intended.',
      },
    ],
  },
  {
    id: 'core-decimal-rules',
    title: 'Core Decimal Rules',
    guidelines: [
      {
        id: 'cdr-1',
        title: 'Multiplication Adds Decimals',
        rule: 'When you multiply two values, their decimal precisions add together.',
        explanation: 'Multiplying (a × 10^d1) by (b × 10^d2) gives (a×b × 10^(d1+d2)). This is fundamental to fixed-point arithmetic. You often need to scale down afterward.',
        examples: [
          { code: '(2 * 1e18) * (3 * 1e18) → 6 * 1e36', label: 'Decimals add: 18 + 18 = 36' },
          { code: 'price (6 decimals) * amount (18 decimals) → 24 decimals', label: 'Mixed decimals' },
        ],
        auditRelevance: 'Forgetting to scale down after multiplication is a classic bug. Result may overflow or have wrong precision. Always verify the scaling factor matches the intended output decimals.',
      },
      {
        id: 'cdr-2',
        title: 'Division Subtracts Decimals',
        rule: 'When you divide two values, the result\'s decimals = numerator decimals - denominator decimals.',
        explanation: 'Dividing (a × 10^d1) by (b × 10^d2) gives (a/b × 10^(d1-d2)). If the denominator has more decimals than the numerator, the result will have negative conceptual decimals (very small number).',
        examples: [
          { code: '(6 * 1e36) / (3 * 1e18) → 2 * 1e18', label: 'Decimals subtract: 36 - 18 = 18' },
          { code: '(amount * price) / 1e18 → scales back to token decimals', label: 'Common pattern' },
        ],
        auditRelevance: 'Division without proper scaling causes precision loss. Verify that divisions scale numerator up before dividing (multiply by precision factor first) to preserve significant digits.',
      },
      {
        id: 'cdr-3',
        title: 'Addition/Subtraction Requires Matching Decimals',
        rule: 'You can only add or subtract values with the same decimal precision (except scalar literals).',
        explanation: 'Adding 1 ETH (18 decimals) to 1 USDC (6 decimals) is meaningless without conversion. SolCalc enforces this constraint to prevent logic errors.',
        examples: [
          { code: '(2 * 1e18) + (3 * 1e18) → 5 * 1e18 ✓', label: 'Valid: same decimals' },
          { code: '(2 * 1e18) + (3 * 1e6) → Error ✗', label: 'Invalid: mismatched decimals' },
        ],
        auditRelevance: 'Mismatched decimal addition is a critical bug. Always verify that operands are scaled to the same precision before addition/subtraction. Check for missing conversions.',
      },
      {
        id: 'cdr-4',
        title: 'Scalar Literal Auto-Lifting',
        rule: 'Plain integer literals (like "1" or "100") automatically adopt the decimal precision of the other operand in addition/subtraction.',
        explanation: 'This makes expressions like "1e18 + 1" work intuitively (adding 1 wei, not 1 token). Only applies to literals, not variables. Only applies to +/- operations.',
        examples: [
          { code: '1e18 + 1 → (1 * 1e18) + (1 * 1e18) = 2 * 1e18', label: 'Auto-lift: 1 becomes 1e18' },
          { code: 'x + 1 where x has 6 decimals → 1 becomes 1e6', label: 'Adapts to variable decimals' },
        ],
        auditRelevance: 'Contracts often add small constants (fees, dust). Verify that these constants are scaled correctly. SolCalc\'s auto-lifting mirrors Solidity\'s implicit casting behavior.',
      },
      {
        id: 'cdr-5',
        title: 'Variables Do NOT Auto-Lift',
        rule: 'Variables defined with explicit decimals never auto-lift, even in addition/subtraction.',
        explanation: 'Auto-lifting only applies to literals. If you define x=1 (6 decimals) and y=1 (18 decimals), you cannot add them. This prevents accidental mismatches.',
        examples: [
          { code: 'x (6 decimals) + y (18 decimals) → Error ✗', label: 'Variables must match' },
          { code: 'x + 1 (where x has 6 decimals) → 1 auto-lifts to 6 decimals ✓', label: 'Literal adapts' },
        ],
        auditRelevance: 'Contracts must explicitly convert variables to matching decimals. Look for missing scaling multiplications when different token types interact.',
      },
    ],
  },
  {
    id: 'powers-scaling',
    title: 'Powers & Scaling',
    guidelines: [
      {
        id: 'ps-1',
        title: 'Scale Constants (1e18, 1e6)',
        rule: '1e18 is a scale constant representing "1.0 with 18 decimal places" (value = 10^18, decimals = 18).',
        explanation: 'In Solidity, 1e18 is shorthand for 1000000000000000000. SolCalc treats this as a properly-scaled fixed-point number, not as scientific notation.',
        examples: [
          { code: '1e18 → value=1000000000000000000, decimals=18', label: 'WAD constant' },
          { code: '1e6 → value=1000000, decimals=6', label: 'USDC scale' },
        ],
        auditRelevance: 'Scale constants are used everywhere in DeFi. Verify that divisions by 1e18 correctly de-scale results. Missing or double-scaling causes magnitude errors.',
      },
      {
        id: 'ps-2',
        title: 'Dynamic Exponentiation (10 ** n)',
        rule: '10 ** n produces a scale constant where n must be a dimensionless integer (decimals = 0).',
        explanation: 'Allows computing scale factors dynamically, e.g., 10 ** tokenDecimals. The exponent must be a pure integer with no fractional part.',
        examples: [
          { code: '10 ** 18 → same as 1e18', label: 'Static exponent' },
          { code: '10 ** (decimals - 6) → dynamic scaling', label: 'Variable exponent' },
        ],
        auditRelevance: 'Dynamic scaling is common when handling multiple token types. Verify that exponent calculations are correct and that the base is always 10.',
      },
      {
        id: 'ps-3',
        title: 'Only Base-10 Exponentiation',
        rule: 'SolCalc only supports 10 ** n. Other bases (2 ** n, x ** y) are not allowed.',
        explanation: 'Restricting to base-10 prevents ambiguity in decimal tracking. General exponentiation would require complex decimal inference rules.',
        examples: [
          { code: '10 ** 18 → Allowed ✓', label: 'Base-10' },
          { code: '2 ** 256 → Not Allowed ✗', label: 'Other base' },
        ],
        auditRelevance: 'Contracts rarely use non-base-10 exponentiation for financial calculations. If you see x ** y, verify it\'s not a decimal-scaled value being exponentiated.',
      },
      {
        id: 'ps-4',
        title: 'Scaling Down After Multiplication',
        rule: 'After multiplying two scaled values, divide by the scale constant to restore original precision.',
        explanation: 'Multiplying two 18-decimal values gives 36 decimals. You must divide by 1e18 to get back to 18 decimals. This is the "mul-div" pattern.',
        examples: [
          { code: '(a * b) / 1e18 → restore to 18 decimals', label: 'Standard WAD math' },
          { code: '(price * amount) / 1e18 → token amount', label: 'Price calculation' },
        ],
        auditRelevance: 'Forgetting to scale down causes overflow or wrong magnitude. Verify every multiplication is followed by appropriate division.',
      },
    ],
  },
  {
    id: 'rounding-loss',
    title: 'Rounding & Loss',
    guidelines: [
      {
        id: 'rl-1',
        title: 'Floor Division (Round Down)',
        rule: 'Floor mode rounds division results down to the nearest integer, matching Solidity\'s native / operator.',
        explanation: 'When 7 / 2, the exact result is 3.5. Floor gives 3 (discards the 0.5). The user loses the fractional part.',
        examples: [
          { code: '7 / 2 (Floor) → 3', label: 'Rounds down' },
          { code: '(3 * 1e18) / 7 (Floor) → Loss: ~0.428 tokens', label: 'Positive loss (user loses)' },
        ],
        auditRelevance: 'Floor division favors the protocol at the user\'s expense. Verify this is intentional. Repeated floor divisions can accumulate significant loss for users.',
      },
      {
        id: 'rl-2',
        title: 'Ceil Division (Round Up)',
        rule: 'Ceil mode rounds division results up to the nearest integer, often implemented in DeFi for fairness.',
        explanation: 'When 7 / 2, Ceil gives 4 (adds the missing 0.5). The protocol loses the fractional part to favor the user.',
        examples: [
          { code: '7 / 2 (Ceil) → 4', label: 'Rounds up' },
          { code: '(3 * 1e18) / 7 (Ceil) → Loss: ~-0.428 tokens', label: 'Negative loss (protocol loses)' },
        ],
        auditRelevance: 'Ceil is used in borrowing/lending to ensure users always get slightly more. Verify ceil is implemented correctly: (a + b - 1) / b. Check for off-by-one errors.',
      },
      {
        id: 'rl-3',
        title: 'Loss = Exact - Result',
        rule: 'Loss shows the difference between the mathematically exact result and the rounded result, displayed in the output\'s decimal precision.',
        explanation: 'Positive loss means the user loses value (floor). Negative loss means the protocol loses value (ceil). Loss is scaled to the result\'s decimals for easy interpretation.',
        examples: [
          { code: '7 / 2 = 3.5 exactly\n7 / 2 (Floor) = 3, Loss = +0.5', label: 'User loses 0.5' },
          { code: '7 / 2 (Ceil) = 4, Loss = -0.5', label: 'Protocol loses 0.5' },
        ],
        auditRelevance: 'Large loss values indicate significant precision loss. Verify that loss is acceptable for the use case. Check if rounding is done before or after scaling.',
      },
      {
        id: 'rl-4',
        title: 'Loss is Always Per-Operation',
        rule: 'Loss is calculated and displayed for each division operation independently, not accumulated across the expression.',
        explanation: 'SolCalc shows the loss from the final division in a complex expression. If there are multiple divisions, only the last one contributes to the displayed loss.',
        examples: [
          { code: '(a / b) / c → only shows loss from (result / c)', label: 'Last division' },
          { code: 'a / (b / c) → shows loss from (a / result)', label: 'Outer division' },
        ],
        auditRelevance: 'Multiple divisions compound precision loss. Manually verify intermediate losses if accuracy is critical. Consider reordering operations to minimize loss.',
      },
      {
        id: 'rl-5',
        title: 'Zero Loss Means Exact Division',
        rule: 'If Loss is 0 (or not shown), the division was exact with no remainder.',
        explanation: 'When the numerator is perfectly divisible by the denominator, there is no rounding and no loss. Floor and Ceil produce identical results.',
        examples: [
          { code: '8 / 2 → 4 (exact), Loss: 0', label: 'No remainder' },
          { code: '(6 * 1e18) / (2 * 1e18) → 3 * 1e0 (exact)', label: 'Clean division' },
        ],
        auditRelevance: 'Exact divisions are ideal. When auditing, check if the contract assumes exact division where it may not hold (e.g., user-provided inputs).',
      },
    ],
  },
  {
    id: 'variables-literals',
    title: 'Variables & Literals',
    guidelines: [
      {
        id: 'vl-1',
        title: 'Defining Variables',
        rule: 'Variables must have both a value and a decimal precision explicitly defined before evaluation.',
        explanation: 'SolCalc auto-detects variables in your expression and prompts you to provide their values and decimals. This simulates passing token amounts into a function.',
        examples: [
          { code: 'Expression: x * y / 1e18\nDefine: x=2 (18 decimals), y=3 (18 decimals)', label: 'Variable definition' },
        ],
        auditRelevance: 'In contracts, verify that all variables have defined types and decimal handling. Missing decimal validation is a common vulnerability.',
      },
      {
        id: 'vl-2',
        title: 'Variable Names',
        rule: 'Variable names must start with a letter and contain only letters, numbers, and underscores.',
        explanation: 'Follows standard identifier rules. Case-sensitive (x and X are different variables).',
        examples: [
          { code: 'Valid: amount, price_usd, token1', label: 'Valid names' },
          { code: 'Invalid: 1amount, price-usd, token$', label: 'Invalid names' },
        ],
        auditRelevance: 'Identifier naming in contracts should be clear and unambiguous. Watch for similar-looking names that could cause confusion (e.g., decimals vs _decimals).',
      },
      {
        id: 'vl-3',
        title: 'Integer Literals',
        rule: 'Plain integers (1, 100, 500) are scalar literals with decimals=0 unless auto-lifted in +/- operations.',
        explanation: 'Scalar literals are dimensionless constants. They adapt to context in addition/subtraction but remain decimals=0 in multiplication/division.',
        examples: [
          { code: '100 * 1e18 → 100 * 1e18 (no auto-lift)', label: 'Multiplication: no lift' },
          { code: '1e18 + 100 → auto-lift 100 to 1e18', label: 'Addition: auto-lift' },
        ],
        auditRelevance: 'Verify that integer constants in contracts are scaled appropriately for their context. Unscaled constants in multiplication cause magnitude errors.',
      },
      {
        id: 'vl-4',
        title: 'Scientific Notation Literals',
        rule: '1e18, 2.5e6, etc. are scale constants with value and decimals derived from the notation.',
        explanation: 'SolCalc parses 1e18 as {value: 10^18, decimals: 18}. Fractional mantissas like 2.5e6 become {value: 2.5 × 10^6, decimals: 6}.',
        examples: [
          { code: '1e18 → {value: 10^18, decimals: 18}', label: 'Unit scale' },
          { code: '2.5e6 → {value: 2500000, decimals: 6}', label: 'Fractional mantissa' },
        ],
        auditRelevance: 'Scale constants are foundational to DeFi. Verify that all scale factors match the intended token decimals (e.g., USDC uses 1e6, not 1e18).',
      },
    ],
  },
  {
    id: 'defi-patterns',
    title: 'Common DeFi Patterns',
    guidelines: [
      {
        id: 'dp-1',
        title: 'Shares to Assets Conversion',
        rule: 'shares * totalAssets / totalShares gives the asset amount for a given share amount.',
        explanation: 'Vault shares represent proportional ownership. Convert shares to assets by multiplying by the exchange rate (totalAssets / totalShares). Must preserve decimals.',
        examples: [
          { code: 'shares (18 decimals) * totalAssets (18 decimals) / totalShares (18 decimals) → 18 decimals', label: 'ERC4626 pattern' },
        ],
        auditRelevance: 'Verify that shares and assets use consistent decimals. Check for rounding mode (floor favors vault, ceil favors user). Ensure no precision loss on small amounts.',
      },
      {
        id: 'dp-2',
        title: 'Price * Amount Calculations',
        rule: 'price * amount / 1e18 converts an amount to its value in another unit (e.g., tokens to USD).',
        explanation: 'Prices are often stored with 18 decimals. Multiplying price by amount gives 36 decimals. Divide by 1e18 to scale back to 18 decimals.',
        examples: [
          { code: '(1500 * 1e18) * (10 * 1e18) / 1e18 → 15000 * 1e18', label: 'ETH price * ETH amount' },
        ],
        auditRelevance: 'Verify the scaling factor matches the price decimals. Wrong scaling causes magnitude errors. Check for missing or double scaling.',
      },
      {
        id: 'dp-3',
        title: 'Interest Accrual (Ray Math)',
        rule: 'Interest rates often use 27 decimals (Ray) for precision. Multiply principal by rate, then divide by 1e27.',
        explanation: 'Ray (10^27) provides extra precision for interest calculations. Common in lending protocols like Aave. Must scale down after multiplication.',
        examples: [
          { code: 'principal (18 decimals) * rate (27 decimals) / 1e27 → 18 decimals', label: 'Interest calculation' },
        ],
        auditRelevance: 'Verify Ray constants use 1e27, not 1e18. Mixing WAD (1e18) and RAY (1e27) causes critical errors. Check for consistent use of scale constants.',
      },
      {
        id: 'dp-4',
        title: 'Basis Points (BPS)',
        rule: 'Basis points (1 BPS = 0.01%) use 4 decimals. To apply a BPS fee: amount * bps / 10000.',
        explanation: 'BPS is a standard for fees and percentages. 100 BPS = 1%. Multiply by BPS, divide by 10000 (not 1e18).',
        examples: [
          { code: 'amount (18 decimals) * 250 (BPS) / 10000 → 2.5% fee', label: '250 BPS = 2.5%' },
        ],
        auditRelevance: 'Verify fee calculations use 10000, not 1e4 or 1e18. Check for missing scaling. Ensure BPS values are validated (max 10000 for 100%).',
      },
    ],
  },
  {
    id: 'limitations',
    title: 'Limitations & Unsupported Features',
    guidelines: [
      {
        id: 'lim-1',
        title: 'No General Exponentiation',
        rule: 'SolCalc does not support x ** y where x ≠ 10 or y is a decimal-scaled value.',
        explanation: 'General exponentiation with decimal tracking is ambiguous. Restricting to 10 ** n keeps the tool focused on DeFi use cases.',
        examples: [
          { code: '10 ** 18 → Allowed ✓', label: 'Base-10 allowed' },
          { code: '2 ** 256 → Not Allowed ✗', label: 'Other bases not allowed' },
        ],
        auditRelevance: 'If a contract uses arbitrary exponentiation, verify it\'s not operating on decimal-scaled values. Exponentiation of scaled values causes exponential magnitude errors.',
      },
      {
        id: 'lim-2',
        title: 'No Bitwise Operations',
        rule: 'SolCalc does not support bitwise AND, OR, XOR, shifts, etc.',
        explanation: 'Bitwise operations are low-level and not relevant to decimal arithmetic. Use a different tool for bitwise analysis.',
        examples: [
          { code: 'x & y → Not Supported ✗', label: 'Bitwise AND' },
          { code: 'x << 2 → Not Supported ✗', label: 'Bit shift' },
        ],
        auditRelevance: 'Bitwise operations in DeFi are rare. If present, verify they\'re not being applied to decimal-scaled values (which would corrupt the value).',
      },
      {
        id: 'lim-3',
        title: 'No Floating-Point Operations',
        rule: 'SolCalc uses BigInt-only arithmetic. No floating-point math at any stage.',
        explanation: 'Matches Solidity\'s integer-only behavior. All values are represented as scaled integers. Division truncates, no rounding to nearest.',
        examples: [
          { code: '7 / 2 → 3 (not 3.5)', label: 'Integer division' },
        ],
        auditRelevance: 'Solidity has no float type. Any "decimal" math must be done via scaled integers. Verify contracts never rely on floating-point behavior.',
      },
      {
        id: 'lim-4',
        title: 'No Function Calls or Complex Expressions',
        rule: 'SolCalc evaluates arithmetic expressions only. No function calls (sqrt, abs, min, max, etc.).',
        explanation: 'Focused on basic arithmetic with decimal tracking. For complex math, break it into steps and evaluate each step separately.',
        examples: [
          { code: 'sqrt(x) → Not Supported ✗', label: 'Function call' },
          { code: '(x + y) * (a - b) → Supported ✓', label: 'Arithmetic only' },
        ],
        auditRelevance: 'When auditing complex math libraries (e.g., sqrt for AMMs), verify each operation separately. Check that decimals are preserved across function boundaries.',
      },
    ],
  },
  {
    id: 'audit-pitfalls',
    title: 'Audit Pitfalls',
    guidelines: [
      {
        id: 'ap-1',
        title: 'Multiplication Before Division',
        rule: 'Always multiply before dividing to preserve precision. a * b / c is better than a / c * b.',
        explanation: 'Dividing first loses precision in the intermediate result. Multiplying first maximizes the numerator before truncation.',
        examples: [
          { code: '(1e18 * 3) / 7 → Loss: ~0.428', label: 'Multiply first (better)' },
          { code: '(1e18 / 7) * 3 → Loss: ~1.285', label: 'Divide first (worse)' },
        ],
        auditRelevance: 'Check operation order in contracts. Premature division causes excess precision loss. Verify the order maximizes numerator before division.',
      },
      {
        id: 'ap-2',
        title: 'Verify Scale Factor Matches Output',
        rule: 'After multiplication, the scale-down factor must match the desired output decimals.',
        explanation: 'If you multiply two 18-decimal values and want 6-decimal output, divide by 1e30 (not 1e18). The scale factor depends on both input and output decimals.',
        examples: [
          { code: '(a * b) / 1e18 → 18-decimal output', label: 'Standard WAD' },
          { code: '(a * b) / 1e30 → 6-decimal output', label: 'Custom scaling' },
        ],
        auditRelevance: 'Mismatched scale factors are a common bug. Verify the divisor is computed correctly based on input and output decimals. Check for hardcoded scale constants.',
      },
      {
        id: 'ap-3',
        title: 'Check Decimal Assumptions on External Calls',
        rule: 'When calling external contracts, never assume decimal precision. Always query decimals() explicitly.',
        explanation: 'Different tokens use different decimals (USDC=6, WETH=18, WBTC=8). Hardcoding 18 decimals causes magnitude errors for non-standard tokens.',
        examples: [
          { code: 'USDC.decimals() → 6 (not 18!)', label: 'Non-standard decimals' },
        ],
        auditRelevance: 'Check if the contract queries decimals() or assumes 18. Assuming 18 for USDC causes 10^12 magnitude error. Verify all token interactions handle variable decimals.',
      },
      {
        id: 'ap-4',
        title: 'Repeated Division Compounds Loss',
        rule: 'Each division operation truncates. Multiple divisions compound the loss. Combine divisions when possible.',
        explanation: '(a / b) / c loses more precision than a / (b * c). Combine denominators to minimize rounding operations.',
        examples: [
          { code: 'a / b / c → Two truncations', label: 'Compounded loss' },
          { code: 'a / (b * c) → One truncation', label: 'Reduced loss' },
        ],
        auditRelevance: 'Look for sequential divisions in contracts. Verify if they can be combined. Check if accumulated loss is acceptable for the use case.',
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced / Audit-Grade',
    guidelines: [
      {
        id: 'adv-1',
        title: 'Overflow Checking',
        rule: 'SolCalc uses BigInt, so overflows are not possible. Solidity 0.8+ has automatic overflow checks.',
        explanation: 'Before Solidity 0.8, arithmetic could silently overflow (wrapping). Modern Solidity reverts on overflow. SolCalc mirrors this behavior by never overflowing.',
        examples: [
          { code: 'type(uint256).max + 1 → Reverts in Solidity 0.8+', label: 'Overflow protection' },
        ],
        auditRelevance: 'For Solidity <0.8, verify SafeMath is used. For 0.8+, verify unchecked blocks are intentional and safe. SolCalc cannot test overflow behavior.',
      },
      {
        id: 'adv-2',
        title: 'Gas-Optimal Rounding',
        rule: 'Ceil division in Solidity uses (a + b - 1) / b to avoid expensive modulo operations.',
        explanation: 'Computing the remainder with a % b costs gas. The formula (a + b - 1) / b achieves ceil without remainder calculation.',
        examples: [
          { code: '(a + b - 1) / b → Ceil without modulo', label: 'Gas-optimized ceil' },
        ],
        auditRelevance: 'Verify ceil implementations use this pattern. Check for edge case: a + b - 1 could overflow if a is near type(uint256).max. Ensure bounds are validated.',
      },
      {
        id: 'adv-3',
        title: 'Negative Values and Signed Arithmetic',
        rule: 'SolCalc supports negative intermediate values (for loss calculation), but Solidity contracts must handle signed types carefully.',
        explanation: 'Solidity has int256 for signed values. Mixing uint and int requires explicit casting. Underflows (e.g., uint256 a - b where b > a) revert.',
        examples: [
          { code: 'int256 loss = int256(exact) - int256(rounded)', label: 'Signed loss calculation' },
        ],
        auditRelevance: 'Verify that contracts use appropriate types (uint vs int). Check for unsafe casts that could cause unexpected behavior. Test boundary cases with negative values.',
      },
      {
        id: 'adv-4',
        title: 'Precision Loss is Unavoidable',
        rule: 'Integer division always loses precision unless exact. Design protocols to tolerate small rounding losses.',
        explanation: 'No amount of clever math can eliminate truncation in integer division. The best you can do is minimize loss and choose the rounding direction intentionally.',
        examples: [
          { code: '(1e18 * 1) / 3 → Loss: ~0.333 tokens', label: 'Unavoidable loss' },
        ],
        auditRelevance: 'Ensure the protocol design accounts for rounding loss. Verify that accumulated dust is handled (e.g., donating to reserves, burning, etc.). Check that loss doesn\'t break invariants.',
      },
    ],
  },
];
