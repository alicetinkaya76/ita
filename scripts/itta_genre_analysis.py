#!/usr/bin/env python3
"""
İTTA — Genre Evolution & Statistical Analysis
================================================
Tests Macit's "Contraction Thesis" quantitatively using chi-square tests,
Shannon entropy, and genre diversity indices.

Requirements:
    pip install pandas numpy scipy matplotlib

Usage:
    python itta_genre_analysis.py

Output:
    results/genre/ directory with CSV tables and PNG figures
"""

import json
import numpy as np
import pandas as pd
from collections import Counter, defaultdict
from pathlib import Path
from scipy import stats as scipy_stats

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    HAS_MPL = True
except ImportError:
    HAS_MPL = False

# ── Paths ──
DATA_DIR = Path("public/data")
OUT_DIR = Path("results/genre")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ══════════════════════════════════════════════════════════════════════
# 1. LOAD DATA
# ══════════════════════════════════════════════════════════════════════
print("Loading data...")
authors = json.load(open(DATA_DIR / "itta_authors.json"))
works = json.load(open(DATA_DIR / "itta_works.json"))

id_to_author = {a["author_id"]: a for a in authors}

# Assign century to each work via its author
for w in works:
    a = id_to_author.get(w["author_id"])
    if a:
        w["century"] = a.get("yuzyil")
        w["havza"] = a.get("havza")
    else:
        w["century"] = None
        w["havza"] = None

# ── Period mapping ──
def get_period(century):
    if century is None:
        return None
    if 7 <= century <= 10:
        return "Formation"
    elif 11 <= century <= 15:
        return "Development"
    elif 16 <= century <= 20:
        return "Contraction"
    return None

PERIOD_ORDER = ["Formation", "Development", "Contraction"]
HAVZA_LIST = ["iran", "misir", "hint", "balkanlar", "magrib", "endulus", "arabistan", "turkistan"]
GENRE_LIST = sorted(set(w["eser_turu"] for w in works if w.get("eser_turu")))

print(f"  Works: {len(works)}")
print(f"  Genres: {len(GENRE_LIST)}")
print(f"  Genres: {GENRE_LIST}")


# ══════════════════════════════════════════════════════════════════════
# 2. GENRE × PERIOD CONTINGENCY TABLE
# ══════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("GENRE × PERIOD ANALYSIS")
print("="*70)

# Build contingency table
genre_period = defaultdict(lambda: Counter())
for w in works:
    period = get_period(w.get("century"))
    genre = w.get("eser_turu")
    if period and genre:
        genre_period[period][genre] += 1

# DataFrame
df_gp = pd.DataFrame(
    {period: {genre: genre_period[period].get(genre, 0) for genre in GENRE_LIST} for period in PERIOD_ORDER}
)
df_gp["Total"] = df_gp.sum(axis=1)
df_gp = df_gp.sort_values("Total", ascending=False)
df_gp.to_csv(OUT_DIR / "genre_by_period.csv")

print("\nGenre × Period counts:")
print(df_gp.to_string())

# ── Chi-square test: Are genre distributions independent of period? ──
contingency = df_gp[PERIOD_ORDER].values
# Remove rows with all zeros
mask = contingency.sum(axis=1) > 0
contingency_clean = contingency[mask]

chi2, p_value, dof, expected = scipy_stats.chi2_contingency(contingency_clean)
print(f"\nChi-square test (Genre × Period):")
print(f"  χ² = {chi2:.2f}")
print(f"  df = {dof}")
print(f"  p-value = {p_value:.2e}")
print(f"  → {'SIGNIFICANT' if p_value < 0.05 else 'Not significant'}: Genre distribution IS {'dependent on' if p_value < 0.05 else 'independent of'} period")

# Cramér's V (effect size)
n = contingency_clean.sum()
min_dim = min(contingency_clean.shape) - 1
cramers_v = np.sqrt(chi2 / (n * min_dim))
print(f"  Cramér's V = {cramers_v:.4f} (effect size: {'small' if cramers_v < 0.1 else 'medium' if cramers_v < 0.3 else 'large'})")


# ══════════════════════════════════════════════════════════════════════
# 3. SHANNON ENTROPY PER PERIOD (genre diversity)
# ══════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("SHANNON ENTROPY (Genre Diversity by Period)")
print("="*70)

def shannon_entropy(counts):
    """Compute Shannon entropy H = -Σ p_i * log2(p_i)"""
    total = sum(counts)
    if total == 0:
        return 0
    probs = [c / total for c in counts if c > 0]
    return -sum(p * np.log2(p) for p in probs)

def normalized_entropy(counts, n_categories):
    """H / H_max where H_max = log2(n_categories)"""
    h = shannon_entropy(counts)
    h_max = np.log2(n_categories) if n_categories > 0 else 1
    return h / h_max

entropy_results = []
for period in PERIOD_ORDER:
    counts = [genre_period[period].get(g, 0) for g in GENRE_LIST]
    h = shannon_entropy(counts)
    h_norm = normalized_entropy(counts, len(GENRE_LIST))
    n_active = sum(1 for c in counts if c > 0)
    total = sum(counts)

    # Simpson's Diversity Index (1 - D)
    if total > 1:
        simpsons = 1 - sum((c/total)**2 for c in counts if c > 0)
    else:
        simpsons = 0

    # Gini-Simpson
    entropy_results.append({
        "period": period,
        "total_works": total,
        "active_genres": n_active,
        "shannon_entropy": round(h, 4),
        "max_entropy": round(np.log2(len(GENRE_LIST)), 4),
        "normalized_entropy": round(h_norm, 4),
        "simpsons_diversity": round(simpsons, 4),
    })
    print(f"\n  {period}:")
    print(f"    Works: {total}")
    print(f"    Active genres: {n_active}/{len(GENRE_LIST)}")
    print(f"    Shannon entropy: {h:.4f} (max={np.log2(len(GENRE_LIST)):.4f})")
    print(f"    Normalized entropy: {h_norm:.4f}")
    print(f"    Simpson's diversity: {simpsons:.4f}")

df_entropy = pd.DataFrame(entropy_results)
df_entropy.to_csv(OUT_DIR / "entropy_by_period.csv", index=False)

# ── Interpretation of contraction thesis ──
print("\n  CONTRACTION THESIS TEST:")
f_entropy = entropy_results[0]["normalized_entropy"]
d_entropy = entropy_results[1]["normalized_entropy"]
c_entropy = entropy_results[2]["normalized_entropy"]
print(f"    Formation → Development: entropy {'INCREASED' if d_entropy > f_entropy else 'DECREASED'} ({f_entropy:.4f} → {d_entropy:.4f})")
print(f"    Development → Contraction: entropy {'INCREASED' if c_entropy > d_entropy else 'DECREASED'} ({d_entropy:.4f} → {c_entropy:.4f})")
if d_entropy > f_entropy and c_entropy < d_entropy:
    print(f"    ✅ SUPPORTS Macit's thesis: diversity peaked in Development, contracted in Contraction")
elif c_entropy < d_entropy:
    print(f"    ⚠️ PARTIALLY supports: contraction visible but formation pattern differs")
else:
    print(f"    ❌ Does NOT support simple contraction narrative")


# ══════════════════════════════════════════════════════════════════════
# 4. GENRE × PERIOD × HAVZA (3-way analysis)
# ══════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("ENTROPY BY PERIOD × HAVZA")
print("="*70)

havza_period_entropy = []
for havza in HAVZA_LIST:
    for period in PERIOD_ORDER:
        h_works = [w for w in works if w.get("havza") == havza and get_period(w.get("century")) == period]
        counts = Counter(w.get("eser_turu") for w in h_works)
        all_counts = [counts.get(g, 0) for g in GENRE_LIST]
        h = shannon_entropy(all_counts)
        h_norm = normalized_entropy(all_counts, len(GENRE_LIST))
        havza_period_entropy.append({
            "havza": havza,
            "period": period,
            "works": sum(all_counts),
            "active_genres": sum(1 for c in all_counts if c > 0),
            "shannon_entropy": round(h, 4),
            "normalized_entropy": round(h_norm, 4),
        })

df_hpe = pd.DataFrame(havza_period_entropy)
pivot = df_hpe.pivot_table(index="havza", columns="period", values="normalized_entropy", fill_value=0)
pivot = pivot[PERIOD_ORDER]
pivot.to_csv(OUT_DIR / "entropy_havza_period.csv")

print("\nNormalized entropy by Havza × Period:")
print(pivot.to_string())

# ── Which basins show contraction? ──
print("\n  Basin-level contraction test (Development → Contraction):")
for havza in HAVZA_LIST:
    dev = pivot.loc[havza, "Development"] if havza in pivot.index else 0
    con = pivot.loc[havza, "Contraction"] if havza in pivot.index else 0
    direction = "↓ CONTRACTED" if con < dev else "↑ EXPANDED" if con > dev else "= STABLE"
    print(f"    {havza:12s}: {dev:.4f} → {con:.4f}  {direction}")


# ══════════════════════════════════════════════════════════════════════
# 5. GENRE DOMINANCE SHIFT (Top genre per period per basin)
# ══════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("DOMINANT GENRE PER PERIOD × BASIN")
print("="*70)

dominance_rows = []
for havza in HAVZA_LIST:
    for period in PERIOD_ORDER:
        h_works = [w for w in works if w.get("havza") == havza and get_period(w.get("century")) == period]
        if not h_works:
            continue
        counts = Counter(w.get("eser_turu") for w in h_works)
        top_genre, top_count = counts.most_common(1)[0]
        total = sum(counts.values())
        dominance_rows.append({
            "havza": havza,
            "period": period,
            "dominant_genre": top_genre,
            "dominant_count": top_count,
            "total_works": total,
            "dominance_pct": round(top_count / total * 100, 1),
        })

df_dom = pd.DataFrame(dominance_rows)
pivot_dom = df_dom.pivot_table(index="havza", columns="period", values="dominant_genre", aggfunc="first")
pivot_dom = pivot_dom[PERIOD_ORDER]
pivot_dom.to_csv(OUT_DIR / "dominant_genre_by_period_havza.csv")
print(pivot_dom.to_string())


# ══════════════════════════════════════════════════════════════════════
# 6. GENRE PROPORTION SHIFT (modern_arastirma growth)
# ══════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("MODERN_ARASTIRMA PROPORTION BY PERIOD")
print("="*70)

for period in PERIOD_ORDER:
    p_works = [w for w in works if get_period(w.get("century")) == period]
    total = len(p_works)
    modern = sum(1 for w in p_works if w.get("eser_turu") == "modern_arastirma")
    pct = modern / total * 100 if total > 0 else 0
    print(f"  {period:15s}: {modern:4d}/{total:4d} = {pct:5.1f}%")


# ══════════════════════════════════════════════════════════════════════
# 7. STATISTICAL TESTS: PAIRWISE PERIOD COMPARISONS
# ══════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("PAIRWISE CHI-SQUARE TESTS (Period Pairs)")
print("="*70)

for pair in [("Formation", "Development"), ("Development", "Contraction"), ("Formation", "Contraction")]:
    p1, p2 = pair
    counts1 = [genre_period[p1].get(g, 0) for g in GENRE_LIST]
    counts2 = [genre_period[p2].get(g, 0) for g in GENRE_LIST]
    # Remove genres with zero in both
    mask = [(c1 + c2) > 0 for c1, c2 in zip(counts1, counts2)]
    c1_clean = [c for c, m in zip(counts1, mask) if m]
    c2_clean = [c for c, m in zip(counts2, mask) if m]

    contingency_pair = np.array([c1_clean, c2_clean])
    chi2, p_val, dof, _ = scipy_stats.chi2_contingency(contingency_pair)
    n_pair = contingency_pair.sum()
    v = np.sqrt(chi2 / (n_pair * (min(contingency_pair.shape) - 1)))

    print(f"\n  {p1} vs {p2}:")
    print(f"    χ² = {chi2:.2f}, df = {dof}, p = {p_val:.2e}, Cramér's V = {v:.4f}")


# ══════════════════════════════════════════════════════════════════════
# 8. CENTURY-LEVEL GENRE ENTROPY TREND
# ══════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("CENTURY-LEVEL GENRE ENTROPY TREND")
print("="*70)

century_entropy = []
for century in range(7, 21):
    c_works = [w for w in works if w.get("century") == century]
    if not c_works:
        continue
    counts = Counter(w.get("eser_turu") for w in c_works)
    all_counts = [counts.get(g, 0) for g in GENRE_LIST]
    h = shannon_entropy(all_counts)
    h_norm = normalized_entropy(all_counts, len(GENRE_LIST))
    century_entropy.append({
        "century": century,
        "works": len(c_works),
        "active_genres": sum(1 for c in all_counts if c > 0),
        "shannon_entropy": round(h, 4),
        "normalized_entropy": round(h_norm, 4),
        "period": get_period(century),
    })

df_ce = pd.DataFrame(century_entropy)
df_ce.to_csv(OUT_DIR / "century_entropy_trend.csv", index=False)
print(df_ce.to_string(index=False))

# ── Linear regression: entropy over centuries ──
if len(df_ce) > 3:
    from scipy.stats import pearsonr, spearmanr
    centuries = df_ce["century"].values
    entropies = df_ce["normalized_entropy"].values
    r_pearson, p_pearson = pearsonr(centuries, entropies)
    r_spearman, p_spearman = spearmanr(centuries, entropies)
    print(f"\n  Pearson r (century vs entropy): {r_pearson:.4f}, p = {p_pearson:.4f}")
    print(f"  Spearman ρ: {r_spearman:.4f}, p = {p_spearman:.4f}")

    # Dev period peak test
    dev_centuries = df_ce[df_ce["period"] == "Development"]["normalized_entropy"]
    con_centuries = df_ce[df_ce["period"] == "Contraction"]["normalized_entropy"]
    if len(dev_centuries) > 1 and len(con_centuries) > 1:
        t_stat, t_p = scipy_stats.mannwhitneyu(dev_centuries, con_centuries, alternative="greater")
        print(f"\n  Mann-Whitney U (Development > Contraction entropy):")
        print(f"    U = {t_stat:.2f}, p = {t_p:.4f}")
        print(f"    → {'SIGNIFICANT' if t_p < 0.05 else 'Not significant'}: Development entropy {'is' if t_p < 0.05 else 'is NOT'} significantly higher")


# ══════════════════════════════════════════════════════════════════════
# 9. FIGURES (if matplotlib available)
# ══════════════════════════════════════════════════════════════════════
if HAS_MPL:
    print("\nGenerating figures...")

    # Fig 1: Century entropy trend
    fig, ax = plt.subplots(figsize=(10, 5))
    colors = {"Formation": "#1565C0", "Development": "#2E7D32", "Contraction": "#C62828"}
    for _, row in df_ce.iterrows():
        ax.bar(row["century"], row["normalized_entropy"],
               color=colors.get(row["period"], "#999"), width=0.7, alpha=0.8)
    ax.set_xlabel("Century", fontsize=12)
    ax.set_ylabel("Normalized Shannon Entropy", fontsize=12)
    ax.set_title("Genre Diversity Over Time (7th–20th Century)", fontsize=14)
    ax.set_xticks(range(7, 21))
    ax.set_xticklabels([f"{c}th" for c in range(7, 21)], rotation=45)
    # Legend
    from matplotlib.patches import Patch
    legend_elements = [Patch(facecolor=c, label=l) for l, c in colors.items()]
    ax.legend(handles=legend_elements, loc="upper right")
    fig.tight_layout()
    fig.savefig(OUT_DIR / "fig_entropy_trend.png", dpi=150)
    print("  Saved fig_entropy_trend.png")

    # Fig 2: Genre proportions by period (stacked bar)
    fig, axes = plt.subplots(1, 3, figsize=(16, 6), sharey=True)
    top_genres = df_gp.head(10).index.tolist()
    genre_colors = plt.cm.Set3(np.linspace(0, 1, len(top_genres)))

    for idx, period in enumerate(PERIOD_ORDER):
        ax = axes[idx]
        counts = [genre_period[period].get(g, 0) for g in top_genres]
        total = sum(counts)
        pcts = [c/total*100 if total > 0 else 0 for c in counts]
        bars = ax.barh(range(len(top_genres)), pcts, color=genre_colors)
        ax.set_yticks(range(len(top_genres)))
        ax.set_yticklabels(top_genres, fontsize=9)
        ax.set_xlabel("% of works")
        ax.set_title(f"{period}\n(n={total})")
        ax.invert_yaxis()

    fig.suptitle("Top 10 Genre Distribution by Period", fontsize=14, y=1.02)
    fig.tight_layout()
    fig.savefig(OUT_DIR / "fig_genre_by_period.png", dpi=150, bbox_inches="tight")
    print("  Saved fig_genre_by_period.png")

    plt.close("all")


# ══════════════════════════════════════════════════════════════════════
# 10. SUMMARY
# ══════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("SUMMARY FOR PAPER")
print("="*70)

summary_lines = [
    f"Genre × Period chi-square: χ²={chi2:.2f}, df={dof}, p={p_value:.2e}, Cramér's V={cramers_v:.4f}",
    f"",
    f"Shannon entropy by period:",
    f"  Formation:   H_norm = {entropy_results[0]['normalized_entropy']:.4f} ({entropy_results[0]['active_genres']} genres, {entropy_results[0]['total_works']} works)",
    f"  Development: H_norm = {entropy_results[1]['normalized_entropy']:.4f} ({entropy_results[1]['active_genres']} genres, {entropy_results[1]['total_works']} works)",
    f"  Contraction: H_norm = {entropy_results[2]['normalized_entropy']:.4f} ({entropy_results[2]['active_genres']} genres, {entropy_results[2]['total_works']} works)",
    f"",
    f"Contraction thesis: {'SUPPORTED' if entropy_results[2]['normalized_entropy'] < entropy_results[1]['normalized_entropy'] else 'NOT SUPPORTED'} by entropy analysis",
]

for line in summary_lines:
    print(f"  {line}")

with open(OUT_DIR / "summary_for_paper.txt", "w") as f:
    f.write("\n".join(summary_lines))

print(f"\n✅ All results saved to {OUT_DIR}/")
