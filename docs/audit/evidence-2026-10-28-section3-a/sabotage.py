"""Break one guard, run its test file, print the failure lines, restore the file byte for byte."""
import subprocess, sys, shutil, re

CORE = r"C:\Projects\FPA-wt-section3\core"
CASES = {
    "28": ("src/parameters/fact-finder-2026-10.ts", "{ weekly: 52, fortnightly: 26,", "{ weekly: 48, fortnightly: 26,", "test/section3-guards.test.ts", "Use ×4 for weekly (the weekly row 52 → 48)"),
    "29": ("src/engine-facts.ts", "      costs: split.costs,", "      costs: [...split.costs, { label: \"Debt payments\", monthly: facts.debts.items.reduce((a, d) => a + d.minimumMonthly, 0) }],", "test/section3-guards.test.ts", "Add debt payments to the budget too (toEngineFacts adds them as a cost line)"),
    "30": ("src/closing-ladder.ts", "  const floor = b.num(\"core:ff.insurance.floorMonthly\");\n  const stage0", "  const floor = 0;\n  const stage0", "test/section3-guards.test.ts", "Drop the floor (insuranceRange uses 0, not the $200 row)"),
    "31": ("src/room-plan.ts", "  for (const k of ROOM_ORDER) {", "  for (const k of [\"shortfall\", \"buffer\", \"debt\", \"protection\", \"emergency\", \"retirement\", \"goals\"] as const) {", "test/section3-guards.test.ts", "Swap steps 2 and 3 (the default split fills debt before protection)"),
    "32": ("src/debt-payoff.ts", "  const r = ratePct / 1200;", "  const r = 0;", "test/section3-guards.test.ts", "Ignore interest (payoffMonths uses a 0% rate)"),
    "33": ("src/retirement-figure.ts", "  const todayMonthly = Math.max(A, B);", "  const todayMonthly = A;", "test/section3-guards.test.ts", "Use A only"),
    "27": ("src/closing-ladder.ts", "  const lo = r.stage0 ? budget.band.floor : r.minMonthly;", "  const lo = budget.band.floor;", "test/f18-package-cards.test.ts", "The old range: the band's floor, not $200"),
    "3": ("src/closing-ladder.ts", "    maxMonthly: stage0 ? 0 : Math.max(budget.ceilingMonthly, floor),", "    maxMonthly: stage0 ? 0 : 2 * Math.max(budget.ceilingMonthly, floor),", "test/closing-guards.test.ts", "Let the slider run to twice max(ceiling, floor)"),
}

def run(key):
    path, old, new, test, what = CASES[key]
    full = f"{CORE}\\{path}"
    backup = full + ".sabotage-bak"
    shutil.copyfile(full, backup)
    try:
        s = open(full, encoding="utf8").read()
        assert s.count(old) == 1, f"guard {key}: anchor not found once"
        open(full, "w", encoding="utf8", newline="").write(s.replace(old, new))
        out = subprocess.run(["node", "--test", test], cwd=CORE, capture_output=True, text=True, encoding="utf8").stdout
    finally:
        shutil.copyfile(backup, full)
        import os; os.remove(backup)
    fails = [l for l in out.splitlines() if l.startswith("✖") ]
    msgs = [l.strip() for l in out.splitlines() if re.search(r"(AssertionError|Error \[)", l)]
    counts = [l for l in out.splitlines() if re.match(r"ℹ (pass|fail)", l)]
    print(f"### guard {key}: {what}\nfile {path}; ran node --test {test}")
    for l in dict.fromkeys(fails): print("  ", l)
    for l in dict.fromkeys(msgs): print("  ", l[:400])
    for l in counts: print("  ", l)
    print()

for k in sys.argv[1:]:
    run(k)
