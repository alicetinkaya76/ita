#!/usr/bin/env python3
"""
İTTA — Expert Evaluation Survey Generator
==========================================
Generates a structured evaluation form for 5–10 domain experts.
Outputs both a printable DOCX (via markdown) and a CSV scoring sheet.

Usage:
    python itta_expert_evaluation.py

Output:
    results/evaluation/ directory with survey form and scoring template
"""

from pathlib import Path

OUT_DIR = Path("results/evaluation")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ══════════════════════════════════════════════════════════════════════
# SURVEY FORM (Markdown — convert to DOCX with pandoc if needed)
# ══════════════════════════════════════════════════════════════════════

survey_md = """# İTTA Platform Expert Evaluation Form

## Atlas of Islamic Historiography — Expert Review

**Evaluator Name:** ______________________________
**Affiliation:** ______________________________
**Area of Expertise:** ______________________________
**Date:** ______________________________

---

**Instructions:** Please explore the İTTA platform at [URL] for at least 30 minutes before completing this form. Try each module listed below. Rate each item on a 5-point Likert scale (1 = Strongly Disagree, 5 = Strongly Agree). Add written comments where indicated.

---

## Part A: Data Quality & Coverage (5 items)

| # | Statement | 1 | 2 | 3 | 4 | 5 |
|---|-----------|---|---|---|---|---|
| A1 | The historians included in İTTA are representative of the Islamic historiographical tradition in my area of expertise. | ☐ | ☐ | ☐ | ☐ | ☐ |
| A2 | The biographical data (birth/death dates, cities, affiliations) is accurate for scholars I know. | ☐ | ☐ | ☐ | ☐ | ☐ |
| A3 | The genre categorisation of works (e.g., sīra, ṭabaqāt, dynastic history) is appropriate and accurate. | ☐ | ☐ | ☐ | ☐ | ☐ |
| A4 | The teacher–student relations shown are historically plausible and useful. | ☐ | ☐ | ☐ | ☐ | ☐ |
| A5 | The three-period framework (Formation / Development / Contraction) is a useful analytical lens for Islamic historiography. | ☐ | ☐ | ☐ | ☐ | ☐ |

**A-Comments:** Which scholars or works are notably missing from the basin(s) you know best?

______________________________________________________________________

______________________________________________________________________

---

## Part B: Visualization & Interface (6 items)

| # | Statement | 1 | 2 | 3 | 4 | 5 |
|---|-----------|---|---|---|---|---|
| B1 | The interactive map effectively conveys the geographic distribution of historiographic activity. | ☐ | ☐ | ☐ | ☐ | ☐ |
| B2 | The scholar network graph reveals meaningful intellectual connections. | ☐ | ☐ | ☐ | ☐ | ☐ |
| B3 | The silsile (chain) view is useful for tracing teacher–student lineages. | ☐ | ☐ | ☐ | ☐ | ☐ |
| B4 | The timeline view effectively shows temporal patterns in historiographic production. | ☐ | ☐ | ☐ | ☐ | ☐ |
| B5 | The basin comparison feature provides genuinely new comparative insights. | ☐ | ☐ | ☐ | ☐ | ☐ |
| B6 | The platform is easy to navigate and understand without training. | ☐ | ☐ | ☐ | ☐ | ☐ |

**B-Comments:** Which visualization was most insightful? Which was least useful?

______________________________________________________________________

______________________________________________________________________

---

## Part C: Research Value (5 items)

| # | Statement | 1 | 2 | 3 | 4 | 5 |
|---|-----------|---|---|---|---|---|
| C1 | İTTA would be useful for my own research. | ☐ | ☐ | ☐ | ☐ | ☐ |
| C2 | İTTA reveals patterns or connections I was not previously aware of. | ☐ | ☐ | ☐ | ☐ | ☐ |
| C3 | İTTA would be useful as a teaching resource for graduate students. | ☐ | ☐ | ☐ | ☐ | ☐ |
| C4 | The cross-basin comparative perspective is a significant scholarly contribution. | ☐ | ☐ | ☐ | ☐ | ☐ |
| C5 | İTTA fills a gap that no existing digital platform covers. | ☐ | ☐ | ☐ | ☐ | ☐ |

**C-Comments:** Can you describe one specific research question or teaching scenario where İTTA would be valuable?

______________________________________________________________________

______________________________________________________________________

---

## Part D: Comparative Assessment (3 items)

| # | Statement | 1 | 2 | 3 | 4 | 5 |
|---|-----------|---|---|---|---|---|
| D1 | Compared to existing tools (e.g., KITAB, OpenITI, al-Ṯurayyā), İTTA offers a distinct and valuable perspective. | ☐ | ☐ | ☐ | ☐ | ☐ |
| D2 | The integration of expert-curated data (MHTT monographs) with encyclopedic data (DİA) is a methodological strength. | ☐ | ☐ | ☐ | ☐ | ☐ |
| D3 | The multilingual interface (Turkish/English/Arabic) makes the platform accessible to a wider audience. | ☐ | ☐ | ☐ | ☐ | ☐ |

---

## Part E: Open-Ended Feedback

**E1.** What are İTTA's three greatest strengths?

1. ______________________________________________________________________

2. ______________________________________________________________________

3. ______________________________________________________________________

**E2.** What are the three most important improvements needed?

1. ______________________________________________________________________

2. ______________________________________________________________________

3. ______________________________________________________________________

**E3.** Would you recommend İTTA to colleagues? Why or why not?

______________________________________________________________________

______________________________________________________________________

---

## Overall Assessment

**Overall rating of İTTA as a research tool:**
☐ 1 (Poor) ☐ 2 (Fair) ☐ 3 (Good) ☐ 4 (Very Good) ☐ 5 (Excellent)

**Signature:** ______________________________

---
*Thank you for your evaluation. Your feedback is essential for improving İTTA and will be reported (anonymised) in the accompanying research publication.*
"""

with open(OUT_DIR / "itta_expert_survey.md", "w") as f:
    f.write(survey_md)
print(f"✅ Survey form saved to {OUT_DIR}/itta_expert_survey.md")


# ══════════════════════════════════════════════════════════════════════
# CSV SCORING TEMPLATE (for collecting numerical data)
# ══════════════════════════════════════════════════════════════════════

import csv

items = [
    ("A1", "Data Quality", "Historian coverage is representative"),
    ("A2", "Data Quality", "Biographical data is accurate"),
    ("A3", "Data Quality", "Genre categorisation is appropriate"),
    ("A4", "Data Quality", "Teacher–student relations are plausible"),
    ("A5", "Data Quality", "Three-period framework is useful"),
    ("B1", "Visualization", "Map conveys geographic distribution"),
    ("B2", "Visualization", "Network reveals intellectual connections"),
    ("B3", "Visualization", "Silsile view is useful for lineages"),
    ("B4", "Visualization", "Timeline shows temporal patterns"),
    ("B5", "Visualization", "Basin comparison gives new insights"),
    ("B6", "Visualization", "Platform is easy to navigate"),
    ("C1", "Research Value", "Useful for my research"),
    ("C2", "Research Value", "Reveals unknown patterns"),
    ("C3", "Research Value", "Useful for teaching"),
    ("C4", "Research Value", "Cross-basin perspective is significant"),
    ("C5", "Research Value", "Fills a gap in digital platforms"),
    ("D1", "Comparative", "Distinct from KITAB/OpenITI/al-Ṯurayyā"),
    ("D2", "Comparative", "Expert+encyclopedic data is strength"),
    ("D3", "Comparative", "Multilingual interface is accessible"),
    ("Overall", "Overall", "Overall rating"),
]

# Template with columns for up to 10 evaluators
with open(OUT_DIR / "itta_scoring_template.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    header = ["item_id", "category", "statement"] + [f"evaluator_{i+1}" for i in range(10)]
    writer.writerow(header)
    for item_id, cat, statement in items:
        writer.writerow([item_id, cat, statement] + [""] * 10)

print(f"✅ Scoring template saved to {OUT_DIR}/itta_scoring_template.csv")


# ══════════════════════════════════════════════════════════════════════
# ANALYSIS SCRIPT (run after collecting data)
# ══════════════════════════════════════════════════════════════════════

analysis_script = '''#!/usr/bin/env python3
"""
İTTA — Expert Evaluation Analysis
Run this AFTER collecting survey data in itta_scoring_template.csv

Requirements: pip install pandas numpy scipy
"""

import pandas as pd
import numpy as np
from scipy import stats

# Load filled-in scoring template
df = pd.read_csv("results/evaluation/itta_scoring_template.csv")

# Get evaluator columns (non-empty)
eval_cols = [c for c in df.columns if c.startswith("evaluator_")]
eval_cols = [c for c in eval_cols if df[c].notna().any()]

print(f"Evaluators: {len(eval_cols)}")

# Convert to numeric
for c in eval_cols:
    df[c] = pd.to_numeric(df[c], errors="coerce")

# Compute statistics per item
df["mean"] = df[eval_cols].mean(axis=1).round(2)
df["std"] = df[eval_cols].std(axis=1).round(2)
df["median"] = df[eval_cols].median(axis=1)
df["min"] = df[eval_cols].min(axis=1)
df["max"] = df[eval_cols].max(axis=1)

print("\\nPer-item statistics:")
print(df[["item_id", "category", "statement", "mean", "std", "median"]].to_string(index=False))

# Category means
print("\\nCategory means:")
cat_means = df.groupby("category")["mean"].agg(["mean", "std", "count"])
print(cat_means)

# Cronbach's alpha (internal consistency)
scores = df[eval_cols].dropna().values
if scores.shape[0] > 2 and scores.shape[1] > 1:
    k = scores.shape[1]
    item_vars = scores.var(axis=0, ddof=1)
    total_var = scores.sum(axis=1).var(ddof=1)
    alpha = (k / (k - 1)) * (1 - item_vars.sum() / total_var)
    print(f"\\nCronbach's alpha: {alpha:.3f}")

# Overall mean
overall = df[df["item_id"] == "Overall"]["mean"].values
if len(overall) > 0:
    print(f"\\nOverall platform rating: {overall[0]:.2f} / 5.00")

# Save analysis results
df.to_csv("results/evaluation/itta_evaluation_results.csv", index=False)
print("\\n✅ Results saved to results/evaluation/itta_evaluation_results.csv")
'''

with open(OUT_DIR / "analyze_evaluation.py", "w") as f:
    f.write(analysis_script)
print(f"✅ Analysis script saved to {OUT_DIR}/analyze_evaluation.py")

print(f"\n{'='*50}")
print("NEXT STEPS:")
print("="*50)
print("1. Convert survey to DOCX: pandoc itta_expert_survey.md -o itta_expert_survey.docx")
print("2. Distribute to 5-10 Islamic history experts")
print("3. Collect scores in itta_scoring_template.csv")
print("4. Run: python results/evaluation/analyze_evaluation.py")
