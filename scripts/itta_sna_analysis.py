#!/usr/bin/env python3
"""
İTTA — Social Network Analysis (SNA) Script
=============================================
Run this in your itta project root directory where public/data/ exists.

Requirements:
    pip install networkx pandas numpy scipy matplotlib python-louvain

Usage:
    python itta_sna_analysis.py

Output:
    results/sna/ directory with CSV tables and PNG figures
"""

import json
import os
import numpy as np
import pandas as pd
import networkx as nx
from collections import Counter, defaultdict
from pathlib import Path

# ── Try optional imports ──
try:
    import community as community_louvain  # pip install python-louvain
    HAS_LOUVAIN = True
except ImportError:
    HAS_LOUVAIN = False
    print("WARNING: python-louvain not installed. Install with: pip install python-louvain")

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    HAS_MPL = True
except ImportError:
    HAS_MPL = False

# ── Paths ──
DATA_DIR = Path("public/data")
OUT_DIR = Path("results/sna")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ══════════════════════════════════════════════════════════════════════
# 1. LOAD DATA
# ══════════════════════════════════════════════════════════════════════
print("Loading data...")
authors = json.load(open(DATA_DIR / "itta_authors.json"))
relations = json.load(open(DATA_DIR / "itta_relations.json"))
works = json.load(open(DATA_DIR / "itta_works.json"))

# Build lookup: dia_slug -> author info
slug_to_author = {}
for a in authors:
    if a.get("dia_slug"):
        slug_to_author[a["dia_slug"]] = a
# Also index by author_id
id_to_author = {a["author_id"]: a for a in authors}

print(f"  Authors: {len(authors)}")
print(f"  Authors with DİA slug: {len(slug_to_author)}")
print(f"  Relations: {len(relations)}")
print(f"  Works: {len(works)}")

# ══════════════════════════════════════════════════════════════════════
# 2. BUILD NETWORKS
# ══════════════════════════════════════════════════════════════════════
print("\nBuilding networks...")

# --- 2a. Full network (all relations) ---
G_full = nx.Graph()
for r in relations:
    G_full.add_edge(r["source"], r["target"], type=r["type"])

# Add node attributes
for node in G_full.nodes():
    if node in slug_to_author:
        a = slug_to_author[node]
        G_full.nodes[node]["havza"] = a.get("havza", "unknown")
        G_full.nodes[node]["century"] = a.get("yuzyil")
        G_full.nodes[node]["name"] = a.get("meshur_isim", node)
        G_full.nodes[node]["death_year"] = a.get("vefat_yili_m")
        G_full.nodes[node]["in_itta"] = True
    else:
        G_full.nodes[node]["havza"] = "external"
        G_full.nodes[node]["century"] = None
        G_full.nodes[node]["name"] = node
        G_full.nodes[node]["in_itta"] = False

print(f"  Full network: {G_full.number_of_nodes()} nodes, {G_full.number_of_edges()} edges")

# --- 2b. Teacher-Student directed network ---
G_ts = nx.DiGraph()
for r in relations:
    if r["type"] == "TEACHER_OF":
        G_ts.add_edge(r["source"], r["target"], type="TEACHER_OF")
    elif r["type"] == "STUDENT_OF":
        G_ts.add_edge(r["target"], r["source"], type="TEACHER_OF")  # normalize direction

# Copy node attributes
for node in G_ts.nodes():
    if node in G_full.nodes:
        G_ts.nodes[node].update(G_full.nodes[node])

print(f"  Teacher-Student network: {G_ts.number_of_nodes()} nodes, {G_ts.number_of_edges()} edges")

# --- 2c. İTTA-only network (both_in_itta edges) ---
G_itta = nx.Graph()
for r in relations:
    if r.get("both_in_itta"):
        G_itta.add_edge(r["source"], r["target"], type=r["type"])
for node in G_itta.nodes():
    if node in G_full.nodes:
        G_itta.nodes[node].update(G_full.nodes[node])

print(f"  İTTA-internal network: {G_itta.number_of_nodes()} nodes, {G_itta.number_of_edges()} edges")


# ══════════════════════════════════════════════════════════════════════
# 3. CENTRALITY MEASURES
# ══════════════════════════════════════════════════════════════════════
print("\nComputing centrality measures...")

# Degree centrality
deg_cent = nx.degree_centrality(G_full)
betw_cent = nx.betweenness_centrality(G_full, k=min(500, G_full.number_of_nodes()))
close_cent = nx.closeness_centrality(G_full)

# For directed network: in-degree (students learning from them) and out-degree (teachers they learned from)
in_deg = dict(G_ts.in_degree())   # how many students
out_deg = dict(G_ts.out_degree()) # how many teachers

# Build centrality DataFrame
centrality_data = []
for node in G_full.nodes():
    info = G_full.nodes[node]
    centrality_data.append({
        "slug": node,
        "name": info.get("name", node),
        "havza": info.get("havza", "unknown"),
        "century": info.get("century"),
        "in_itta": info.get("in_itta", False),
        "degree": G_full.degree(node),
        "degree_centrality": round(deg_cent[node], 6),
        "betweenness_centrality": round(betw_cent[node], 6),
        "closeness_centrality": round(close_cent[node], 6),
        "students_count": in_deg.get(node, 0),    # teacher-student: incoming = students
        "teachers_count": out_deg.get(node, 0),    # teacher-student: outgoing = teachers
    })

df_cent = pd.DataFrame(centrality_data).sort_values("degree", ascending=False)
df_cent.to_csv(OUT_DIR / "centrality_all_nodes.csv", index=False)
print(f"  Saved centrality for {len(df_cent)} nodes")

# ── Top 30 by each metric ──
for metric in ["degree", "betweenness_centrality", "closeness_centrality", "students_count"]:
    top = df_cent.nlargest(30, metric)[["name", "havza", "century", metric, "in_itta"]]
    top.to_csv(OUT_DIR / f"top30_{metric}.csv", index=False)
    print(f"\n  Top 10 by {metric}:")
    for _, row in top.head(10).iterrows():
        print(f"    {row['name']:40s} {row['havza']:12s} c.{row['century']}  {metric}={row[metric]}")


# ══════════════════════════════════════════════════════════════════════
# 4. COMMUNITY DETECTION (Louvain)
# ══════════════════════════════════════════════════════════════════════
if HAS_LOUVAIN:
    print("\nRunning Louvain community detection...")
    partition = community_louvain.best_partition(G_full, random_state=42)
    modularity = community_louvain.modularity(partition, G_full)
    n_communities = len(set(partition.values()))
    print(f"  Communities: {n_communities}")
    print(f"  Modularity: {modularity:.4f}")

    # Assign community to dataframe
    df_cent["community"] = df_cent["slug"].map(partition)
    df_cent.to_csv(OUT_DIR / "centrality_all_nodes.csv", index=False)

    # ── Community composition by havza ──
    comm_havza = defaultdict(lambda: Counter())
    for node, comm_id in partition.items():
        havza = G_full.nodes[node].get("havza", "unknown")
        comm_havza[comm_id][havza] += 1

    # Top 10 largest communities
    comm_sizes = Counter(partition.values())
    print("\n  Top 10 communities (size, dominant havza):")
    comm_rows = []
    for comm_id, size in comm_sizes.most_common(15):
        havza_dist = comm_havza[comm_id]
        dominant = havza_dist.most_common(1)[0]
        pct = dominant[1] / size * 100
        print(f"    Community {comm_id}: {size} nodes, dominant={dominant[0]} ({pct:.0f}%)")
        comm_rows.append({
            "community_id": comm_id,
            "size": size,
            "dominant_havza": dominant[0],
            "dominant_pct": round(pct, 1),
            **{f"n_{h}": havza_dist.get(h, 0) for h in ["iran", "misir", "hint", "balkanlar", "magrib", "endulus", "arabistan", "turkistan", "external"]}
        })

    pd.DataFrame(comm_rows).to_csv(OUT_DIR / "communities_by_havza.csv", index=False)

    # ── Community–Havza alignment (Normalized Mutual Information) ──
    havza_labels = [G_full.nodes[n].get("havza", "unknown") for n in G_full.nodes()]
    comm_labels = [partition[n] for n in G_full.nodes()]

    # Simple alignment metric: what fraction of each community is single-havza?
    homogeneity_scores = []
    for comm_id, size in comm_sizes.most_common(n_communities):
        if size < 5:
            continue
        dist = comm_havza[comm_id]
        max_share = max(dist.values()) / size
        homogeneity_scores.append(max_share)
    avg_homogeneity = np.mean(homogeneity_scores)
    print(f"\n  Average community homogeneity (havza): {avg_homogeneity:.3f}")
    print(f"  (1.0 = perfect havza alignment, lower = cross-basin mixing)")


# ══════════════════════════════════════════════════════════════════════
# 5. CROSS-BASIN KNOWLEDGE FLOW
# ══════════════════════════════════════════════════════════════════════
print("\nAnalysing cross-basin knowledge flow...")

havza_list = ["iran", "misir", "hint", "balkanlar", "magrib", "endulus", "arabistan", "turkistan"]

# Build havza-to-havza flow matrix (teacher-student only)
flow_matrix = pd.DataFrame(0, index=havza_list, columns=havza_list)
cross_basin_edges = 0
same_basin_edges = 0

for r in relations:
    if r["type"] not in ("TEACHER_OF", "STUDENT_OF"):
        continue
    src = r["source"]
    tgt = r["target"]
    src_havza = slug_to_author.get(src, {}).get("havza")
    tgt_havza = slug_to_author.get(tgt, {}).get("havza")

    if src_havza and tgt_havza and src_havza in havza_list and tgt_havza in havza_list:
        if r["type"] == "TEACHER_OF":
            flow_matrix.loc[src_havza, tgt_havza] += 1
        else:  # STUDENT_OF: reverse
            flow_matrix.loc[tgt_havza, src_havza] += 1

        if src_havza != tgt_havza:
            cross_basin_edges += 1
        else:
            same_basin_edges += 1

total_basin_edges = cross_basin_edges + same_basin_edges
print(f"  Basin-attributed teacher-student edges: {total_basin_edges}")
print(f"  Same-basin: {same_basin_edges} ({same_basin_edges/max(total_basin_edges,1)*100:.1f}%)")
print(f"  Cross-basin: {cross_basin_edges} ({cross_basin_edges/max(total_basin_edges,1)*100:.1f}%)")

flow_matrix.to_csv(OUT_DIR / "cross_basin_flow_matrix.csv")
print(f"\n  Cross-basin flow matrix (rows=teacher's basin, cols=student's basin):")
print(flow_matrix.to_string())


# ══════════════════════════════════════════════════════════════════════
# 6. TEMPORAL NETWORK EVOLUTION
# ══════════════════════════════════════════════════════════════════════
print("\nAnalysing temporal network evolution...")

# Assign century to each node based on death year
periods = {
    "Formation (7-10c)": range(7, 11),
    "Development (11-15c)": range(11, 16),
    "Contraction (16-20c)": range(16, 21),
}

temporal_stats = []
for period_name, century_range in periods.items():
    # Get nodes active in this period
    period_nodes = set()
    for node in G_full.nodes():
        c = G_full.nodes[node].get("century")
        if c and c in century_range:
            period_nodes.add(node)

    # Subgraph for this period
    G_period = G_full.subgraph(period_nodes).copy()

    if G_period.number_of_nodes() < 2:
        continue

    # Compute metrics
    n_nodes = G_period.number_of_nodes()
    n_edges = G_period.number_of_edges()
    density = nx.density(G_period)
    components = nx.number_connected_components(G_period)
    largest_cc = max(nx.connected_components(G_period), key=len)
    largest_cc_size = len(largest_cc)

    # Havza distribution in this period
    havza_counts = Counter(G_period.nodes[n].get("havza", "unknown") for n in G_period.nodes())

    # Average degree
    avg_degree = np.mean([d for _, d in G_period.degree()])

    stats = {
        "period": period_name,
        "nodes": n_nodes,
        "edges": n_edges,
        "density": round(density, 6),
        "components": components,
        "largest_component": largest_cc_size,
        "largest_component_pct": round(largest_cc_size / n_nodes * 100, 1),
        "avg_degree": round(avg_degree, 2),
    }
    stats.update({f"n_{h}": havza_counts.get(h, 0) for h in havza_list})
    temporal_stats.append(stats)

    print(f"\n  {period_name}:")
    print(f"    Nodes: {n_nodes}, Edges: {n_edges}, Density: {density:.4f}")
    print(f"    Components: {components}, Largest: {largest_cc_size} ({largest_cc_size/n_nodes*100:.0f}%)")
    print(f"    Avg degree: {avg_degree:.2f}")

df_temporal = pd.DataFrame(temporal_stats)
df_temporal.to_csv(OUT_DIR / "temporal_network_evolution.csv", index=False)


# ══════════════════════════════════════════════════════════════════════
# 7. CENTURY-BY-CENTURY METRICS
# ══════════════════════════════════════════════════════════════════════
print("\nCentury-by-century network metrics...")

century_metrics = []
for century in range(7, 21):
    nodes = [n for n in G_full.nodes() if G_full.nodes[n].get("century") == century]
    if len(nodes) < 2:
        continue
    G_c = G_full.subgraph(nodes).copy()
    havza_counts = Counter(G_c.nodes[n].get("havza", "unknown") for n in G_c.nodes())
    n_havzas = len([h for h in havza_list if havza_counts.get(h, 0) > 0])

    century_metrics.append({
        "century": century,
        "nodes": G_c.number_of_nodes(),
        "edges": G_c.number_of_edges(),
        "density": round(nx.density(G_c), 6),
        "avg_degree": round(np.mean([d for _, d in G_c.degree()]), 2),
        "active_havzas": n_havzas,
        **{f"n_{h}": havza_counts.get(h, 0) for h in havza_list}
    })

df_century = pd.DataFrame(century_metrics)
df_century.to_csv(OUT_DIR / "century_network_metrics.csv", index=False)
print(df_century.to_string(index=False))


# ══════════════════════════════════════════════════════════════════════
# 8. BRIDGE SCHOLARS (cross-basin connectors)
# ══════════════════════════════════════════════════════════════════════
print("\nIdentifying bridge scholars (cross-basin connectors)...")

bridge_scholars = []
for node in G_full.nodes():
    neighbors = list(G_full.neighbors(node))
    if len(neighbors) < 2:
        continue
    neighbor_havzas = set()
    for nb in neighbors:
        h = G_full.nodes[nb].get("havza", "unknown")
        if h != "external":
            neighbor_havzas.add(h)

    node_havza = G_full.nodes[node].get("havza", "unknown")
    if node_havza != "external":
        neighbor_havzas.add(node_havza)

    if len(neighbor_havzas) >= 2:
        bridge_scholars.append({
            "slug": node,
            "name": G_full.nodes[node].get("name", node),
            "havza": node_havza,
            "century": G_full.nodes[node].get("century"),
            "degree": G_full.degree(node),
            "connected_havzas": len(neighbor_havzas),
            "havza_list": ", ".join(sorted(neighbor_havzas)),
            "betweenness": betw_cent.get(node, 0),
        })

df_bridges = pd.DataFrame(bridge_scholars).sort_values("connected_havzas", ascending=False)
df_bridges.to_csv(OUT_DIR / "bridge_scholars.csv", index=False)
print(f"  Scholars connecting 2+ basins: {len(df_bridges)}")
print(f"  Scholars connecting 3+ basins: {len(df_bridges[df_bridges['connected_havzas'] >= 3])}")
print(f"\n  Top 15 bridge scholars:")
for _, row in df_bridges.head(15).iterrows():
    print(f"    {row['name']:40s} {row['havza']:12s} c.{row['century']}  bridges={row['connected_havzas']}  deg={row['degree']}  [{row['havza_list']}]")


# ══════════════════════════════════════════════════════════════════════
# 9. SUMMARY STATISTICS FOR PAPER
# ══════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("SUMMARY STATISTICS FOR PAPER")
print("="*70)

summary = {
    "Full network — nodes": G_full.number_of_nodes(),
    "Full network — edges": G_full.number_of_edges(),
    "Full network — density": round(nx.density(G_full), 6),
    "Full network — connected components": nx.number_connected_components(G_full),
    "Full network — avg degree": round(np.mean([d for _, d in G_full.degree()]), 2),
    "Teacher-Student network — nodes": G_ts.number_of_nodes(),
    "Teacher-Student network — edges": G_ts.number_of_edges(),
    "İTTA-internal network — nodes": G_itta.number_of_nodes(),
    "İTTA-internal network — edges": G_itta.number_of_edges(),
    "Cross-basin teacher-student edges": cross_basin_edges,
    "Same-basin teacher-student edges": same_basin_edges,
    "Bridge scholars (2+ basins)": len(df_bridges),
    "Bridge scholars (3+ basins)": len(df_bridges[df_bridges['connected_havzas'] >= 3]),
}
if HAS_LOUVAIN:
    summary["Louvain communities"] = n_communities
    summary["Modularity"] = round(modularity, 4)
    summary["Avg community homogeneity"] = round(avg_homogeneity, 3)

for k, v in summary.items():
    print(f"  {k}: {v}")

# Save summary
with open(OUT_DIR / "summary_for_paper.txt", "w") as f:
    for k, v in summary.items():
        f.write(f"{k}: {v}\n")

print(f"\n✅ All results saved to {OUT_DIR}/")
print("Files: centrality_all_nodes.csv, top30_*.csv, communities_by_havza.csv,")
print("       cross_basin_flow_matrix.csv, temporal_network_evolution.csv,")
print("       century_network_metrics.csv, bridge_scholars.csv, summary_for_paper.txt")
