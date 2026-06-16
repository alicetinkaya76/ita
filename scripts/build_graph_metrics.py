#!/usr/bin/env python3
"""
Build-time graph metrics for the İTA relations network.

Reads  public/data/itta_relations.json  +  public/data/itta_authors.json
Writes public/data/graph_metrics.json    (a NEW derived file — no schema change)

Metrics are computed on the FULL relation graph (İTA authors + external DİA
figures, ~1855 nodes) so centrality reflects a scholar's true position, then
emitted only for the ~440 İTA-author slugs that the app can actually link to.

Run locally whenever relations change, then commit the output:
    python3 scripts/build_graph_metrics.py
"""
import json, datetime, pathlib
from collections import defaultdict
import networkx as nx

DATA = pathlib.Path(__file__).resolve().parent.parent / "public" / "data"

relations = json.loads((DATA / "itta_relations.json").read_text(encoding="utf-8"))
authors   = json.loads((DATA / "itta_authors.json").read_text(encoding="utf-8"))

itta_slugs = {a["dia_slug"] for a in authors if a.get("dia_slug")}

# --- typed neighbour sets (directed teacher↔student, undirected contemporary) ---
teachers      = defaultdict(set)
students      = defaultdict(set)
contemporaries = defaultdict(set)
for r in relations:
    s, t, typ = r["source"], r["target"], r["type"]
    if typ == "TEACHER_OF":              # s taught t
        students[s].add(t); teachers[t].add(s)
    elif typ == "STUDENT_OF":            # s studied under t  → t taught s
        students[t].add(s); teachers[s].add(t)
    elif typ == "CONTEMPORARY_OF":
        contemporaries[s].add(t); contemporaries[t].add(s)

# --- undirected projection for centrality (collapses inverse/duplicate edges) ---
G = nx.Graph()
for r in relations:
    if r["source"] != r["target"]:
        G.add_edge(r["source"], r["target"])

betweenness = nx.betweenness_centrality(G, normalized=True)
pagerank    = nx.pagerank(G)
comp_size   = {}
components  = list(nx.connected_components(G))
for comp in components:
    for n in comp:
        comp_size[n] = len(comp)

# --- community detection (Louvain) → scholarly "schools/lineages" ---
import networkx.algorithms.community as nxcom
try:
    _comms = nxcom.louvain_communities(G, seed=42)
except Exception:
    _comms = list(nxcom.greedy_modularity_communities(G))
# rank communities by how many İTA authors they contain (largest school = rank 0)
_ranked_comms = sorted(
    ((c, sum(1 for n in c if n in itta_slugs)) for c in _comms),
    key=lambda x: -x[1],
)
_ranked_comms = [(c, k) for c, k in _ranked_comms if k > 0]
community_of = {}
for _rank, (_c, _k) in enumerate(_ranked_comms):
    for _n in _c:
        community_of[_n] = _rank

def r4(x): return round(float(x), 4)
def r6(x): return round(float(x), 6)

nodes_out = {}
for slug in itta_slugs:
    if slug not in G:           # İTA author with no relations at all
        nodes_out[slug] = {
            "teachers": 0, "students": 0, "contemporaries": 0,
            "degree": 0, "betweenness": 0.0, "pagerank": 0.0, "component_size": 0,
            "community": None,
        }
        continue
    nodes_out[slug] = {
        "teachers": len(teachers.get(slug, ())),
        "students": len(students.get(slug, ())),
        "contemporaries": len(contemporaries.get(slug, ())),
        "degree": G.degree(slug),
        "betweenness": r4(betweenness.get(slug, 0.0)),
        "pagerank": r6(pagerank.get(slug, 0.0)),
        "component_size": comp_size.get(slug, 1),
        "community": community_of.get(slug),
    }

# --- school/lineage summary (communities with >=3 İTA authors) ---
havza_by_slug = {a["dia_slug"]: a.get("havza") for a in authors if a.get("dia_slug")}
name_by_slug  = {a["dia_slug"]: a.get("meshur_isim", a["dia_slug"]) for a in authors if a.get("dia_slug")}
communities_out = []
for _rank, (_c, _k) in enumerate(_ranked_comms):
    if _k < 3:
        continue
    _members = sorted((n for n in _c if n in itta_slugs), key=lambda n: pagerank.get(n, 0.0), reverse=True)
    _hv = defaultdict(int)
    for n in _members:
        h = havza_by_slug.get(n)
        if h:
            _hv[h] += 1
    communities_out.append({
        "id": _rank,
        "itta_size": _k,
        "total_size": len(_c),
        "top_havza": (max(_hv.items(), key=lambda x: x[1])[0] if _hv else None),
        "members": [{"slug": n, "name": name_by_slug.get(n, n)} for n in _members[:6]],
    })

summary = {
    "graph_nodes": G.number_of_nodes(),
    "graph_edges": G.number_of_edges(),
    "itta_nodes": len(itta_slugs),
    "itta_with_relations": sum(1 for s in itta_slugs if s in G),
    "itta_internal_edges": sum(1 for r in relations if r.get("both_in_itta")),
    "components": len(components),
    "largest_component": max((len(c) for c in components), default=0),
    "density": r6(nx.density(G)),
    "communities_total": len(_ranked_comms),
    "communities_shown": len(communities_out),
}

out = {
    "generated_at": datetime.date.today().isoformat(),
    "summary": summary,
    "nodes": nodes_out,
    "communities": communities_out,
}
(DATA / "graph_metrics.json").write_text(
    json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
)
print("graph_metrics.json yazıldı.")
print("summary:", json.dumps(summary, ensure_ascii=False))
# top scholars by pagerank (sanity)
ranked = sorted(
    ((s, m["pagerank"], m["degree"]) for s, m in nodes_out.items() if m["degree"] > 0),
    key=lambda x: x[1], reverse=True
)[:8]
name_by_slug = {a["dia_slug"]: a.get("meshur_isim", a["dia_slug"]) for a in authors if a.get("dia_slug")}
print("En yüksek pagerank (İTA):")
for s, pr, deg in ranked:
    print(f"  {name_by_slug.get(s, s):35s} pr={pr:.5f} derece={deg}")
