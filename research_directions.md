# 🧬 Unified Research Plan — Genomic Arbiter

> **Ek Research, Sab Combine**  
> Project: EVO2 Variant Analysis + LangGraph Genomic Arbiter  
> Team: Priyanshu Yadav & Team  
> Date: March 2026

---

## Research Title

> **"RAG-Augmented VUS Reclassification with Verified Clinical Reports: Combining DNA Language Models, Multi-Source Evidence Synthesis, and Hallucination-Aware Report Generation"**

Ye ek single unified research hai — jismein VUS reclassification core hai, aur baaki saari cheezein (domain-specific embeddings, evidence grading, self-correcting loops, hallucination detection) iske andar **naturally fit** hoti hain.

---

## Humara Research Kya Solve Karega

ClinVar database mein **~50% variants "VUS" hain** — Variant of Uncertain Significance. Matlab doctor ko nahi pata ki ye mutation dangerous hai ya nahi. Abhi clinicians bas wait karte hain jab tak ClinVar update na ho — jo months ya years lag sakta hai.

**Humara system**:
1. Evo2 AI se variant score karega
2. Multiple medical databases se evidence gather karega (RAG)
3. Sab evidence ko grade karke ek **verified, readable clinical report** generate karega
4. Predict karega ki VUS variant actually Pathogenic hai ya Benign — **ClinVar update se pehle**

**Ye directly clinicians aur researchers ke kaam aayega.**

---

## Architecture — Combined Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     UNIFIED RESEARCH PIPELINE                          │
│                                                                        │
│  ┌──────────────┐                                                      │
│  │ INPUT:       │                                                      │
│  │ Gene + VUS   │                                                      │
│  │ Variant      │                                                      │
│  └──────┬───────┘                                                      │
│         ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ PHASE 1 — EVIDENCE COLLECTION (Domain-Specific RAG)             │  │
│  │                                                                  │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────────┐  │  │
│  │  │ Ensembl   │  │ ClinVar   │  │ Vector DB │  │ Evo2 Score  │  │  │
│  │  │ Grounding │  │ Discovery │  │ (PubMed + │  │ (NVIDIA API)│  │  │
│  │  │           │  │           │  │  Exa +     │  │             │  │  │
│  │  │           │  │           │  │  Tavily)   │  │             │  │  │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └──────┬──────┘  │  │
│  │        └───────────────┴──────────────┴───────────────┘          │  │
│  └──────────────────────────────┬───────────────────────────────────┘  │
│                                 ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ PHASE 2 — EVIDENCE GRADING (ACMG-Based)                        │  │
│  │                                                                  │  │
│  │  Har evidence piece ko grade karo:                               │  │
│  │  • STRONG: functional studies, segregation data                  │  │
│  │  • MODERATE: computational (Evo2), in-silico predictions         │  │
│  │  • SUPPORTING: population frequency, phenotype match             │  │
│  └──────────────────────────────┬───────────────────────────────────┘  │
│                                 ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ PHASE 3 — REPORT SYNTHESIS + VERIFICATION                      │  │
│  │                                                                  │  │
│  │  Synthesis Node (Qwen3-32B) → Report Generate                   │  │
│  │       ↓                                                          │  │
│  │  Reviewer Node → Quality Check                                   │  │
│  │       ↓                                                          │  │
│  │  ✗ Low Quality? → Loop back to Evidence Collection               │  │
│  │  ✓ High Quality? → Hallucination Check → Citation Verify         │  │
│  │       ↓                                                          │  │
│  │  Clinical Recommendations + Confidence Score                     │  │
│  └──────────────────────────────┬───────────────────────────────────┘  │
│                                 ▼                                      │
│  ┌──────────────┐                                                      │
│  │ OUTPUT:      │                                                      │
│  │ Verified     │                                                      │
│  │ Clinical     │                                                      │
│  │ Report + VUS │                                                      │
│  │ Prediction   │                                                      │
│  └──────────────┘                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase-wise Breakdown

---

### 🟢 Phase 1 — Foundation & Easy Wins

> Ye cheezein **guaranteed kaam karengi** aur zyada mehnat bhi nahi lagegi. Har direction mein ye useful hain.

#### 1.1 Domain-Specific Embeddings

**Abhi**: Tum PubMed/Exa/Tavily se raw text lete ho aur seedha LLM ko dete ho. Koi persistent storage nahi.

**Karna hai**:
- **PubMedBERT** ya **BiomedBERT** embeddings use karo (generic embeddings ki jagah)
- **ChromaDB** ya **Qdrant** mein ek persistent vector store banao
- Usme pre-index karo:
  - Top 50 clinically significant genes ke PubMed abstracts
  - ClinVar ke full records
  - ACMG/AMP guideline documents

**Kyun**: Domain-specific embeddings genomic text ko better samajhte hain. "BRCA1 pathogenic variant" aur "BRCA1 benign polymorphism" ke beech ka difference generic embeddings miss kar sakte hain.

#### 1.2 Section-Aware Chunking

**Abhi**: Agar tum papers store karte ho toh arbitrary token windows pe split hoga.

**Karna hai**:
- Genomic papers ko **sections ke basis pe chunk** karo (Abstract, Results, Discussion — alag alag)
- Results section ka chunk zyada weightage rakhe retrieval mein
- Isse relevant findings zyada accurately retrieve hongi

#### 1.3 Cross-Encoder Re-Ranking

**Karna hai**:
- Retrieval ke baad ek **cross-encoder re-ranker** lagao (`cross-encoder/ms-marco-MiniLM-L-12-v2`)
- Ye retrieved documents ko relevance ke basis pe re-order karega
- Top-k results ki quality dramatically improve hogi

> **Effort**: Low — ~1-2 weeks  
> **Impact**: Har downstream task improve hoga

---

### 🔴 Phase 2 — Core Research (VUS Reclassification)

> Ye **sabse impactful** part hai. Ye research ka dil hai.

#### 2.1 VUS Benchmark Dataset Banana

**Ye sabse pehle karna hai — bina iske kuch measure nahi kar paoge.**

**Kaise banayein**:
1. ClinVar ka historical data download karo (ClinVar releases archives se milega)
2. Woh variants dhundho jo:
   - **2023 mein VUS the**
   - **2025-2026 tak Pathogenic ya Benign reclassify ho gaye**
3. Ye tumhara **ground truth** banega — tum test karoge ki kya tumhara system ye reclassification predict kar sakta tha jab variant abhi bhi VUS tha

**Target**: Kam se kam **200-500 variants** ka dataset jismein:
- ~half VUS → Pathogenic hogaye
- ~half VUS → Benign hogaye

#### 2.2 Evo2 + RAG Combined Scoring

**Abhi**: `/analyze-variant` (Evo2 score) aur `/analyze-clinical-context` (RAG report) alag-alag chalte hain.

**Karna hai**:
- Dono ko **ek unified pipeline** mein combine karo
- Evo2 delta score ko RAG retrieval mein use karo — agar delta bahut negative hai, toh "loss of function" aur "pathogenic mechanism" literature prioritize karo
- Final VUS prediction **sirf Evo2 threshold pe depend na kare** — RAG evidence bhi count ho

**Practically kaise**:
- LangGraph state mein `evo2_delta_score` field add karo
- Conflict Resolution node mein Evo2 score ke basis pe search queries dynamically adjust karo
- Ek simple **weighted scoring formula** banao:

```
VUS_Score = w1 × Evo2_delta + w2 × ClinVar_evidence_count + w3 × PubMed_support + w4 × ACMG_grade
```

Weights ko tumhare benchmark dataset pe optimize karo (simple grid search chalegi).

#### 2.3 ACMG Evidence Grading

**Abhi**: `calculate_confidence` function keyword matching karta hai ("replication", "mechanism"). Fragile hai.

**Karna hai**:
- Har retrieved evidence piece ko **ACMG/AMP framework** ke basis pe automatically grade karo
- LLM se hi karwa sakte ho — ek dedicated prompt banao:

```
"Given this evidence excerpt, classify it according to ACMG/AMP criteria:
- PS (Strong Pathogenic): functional study showing damaging effect
- PM (Moderate Pathogenic): computational evidence, protein domain
- PP (Supporting Pathogenic): cosegregation, phenotype match
- BS (Strong Benign): functional study showing no effect  
- BP (Supporting Benign): population frequency > 5%

Evidence: {retrieved_text}
Classification:"
```

- Ye grading confidence score mein feed hogi — **scientifically rigorous** confidence milega

#### 2.4 Reviewer Node (Self-Correction)

**Karna hai**:
- Synthesis ke baad ek **Reviewer Node** add karo LangGraph mein
- Ye ek alag LLM call hogi jo check karegi:
  - Kya report mein saare evidence sources cited hain?
  - Kya conclusion evidence se match karta hai?
  - Kya recommendations specific hain ya generic?
- Agar quality low hai → **loop back** Conflict Resolution pe refined queries ke saath
- **Max 2 loops** (infinite cycling rokne ke liye)

```python
def reviewer_node(state):
    prompt = """Rate this clinical report (1-10) on:
    1. Completeness - Are all evidence sources cited?
    2. Consistency - Does conclusion match evidence?
    3. Actionability - Are recommendations specific?
    
    Report: {report}
    Evidence used: {evidence}
    
    If score < 7, provide specific feedback for improvement."""
    
    # If score < 7 and iterations < 2, route back to conflict_resolution
    # Else, route to clinical_actionability
```

> **Effort**: High — ~4-6 weeks  
> **Impact**: 🔥 Bahut High — ye paper ka core hoga

---

### 🟡 Phase 3 — Report Quality & Polish

> Reports ko **readable, verified, aur clinician-friendly** banana.

#### 3.1 Hallucination Detection

**Karna hai**:
- Final report generate hone ke baad, har clinical claim extract karo
- Har claim ko retrieved evidence se **cross-check** karo
- Jo claims supported nahi hain, unhe **flag** karo ya **remove** karo
- Report mein clearly likho: "Supported by: [source]" har major claim ke saath

**Practically**:
```python
def hallucination_check_node(state):
    prompt = """Compare each claim in the report against the evidence.
    
    Report: {final_report}
    Evidence: {retrieved_evidence}
    
    For each claim, output:
    - SUPPORTED: [source] 
    - UNSUPPORTED: [flag for removal]
    - PARTIALLY SUPPORTED: [needs qualification]"""
```

#### 3.2 Readable Report Template

**Abhi**: Report free-form markdown hai. Clinicians ke liye scan karna mushkil hai.

**Karna hai** — ek **fixed, clean template** banao:

```markdown
# Clinical Variant Report: {GENE} — {VARIANT_ID}
Generated: {DATE} | Confidence: {SCORE}/10

## ⚡ Quick Summary (2 lines)
One-line verdict + one-line reasoning

## 📊 Evidence Dashboard
| Source        | Finding              | ACMG Grade | Status      |
|---------------|----------------------|------------|-------------|
| Evo2 (AI)     | LOF, delta=-2.73    | PM3        | ⚠ Damaging  |
| ClinVar       | VUS (as of 2023)    | -          | ❓ Uncertain |
| PubMed (2026) | Functional study... | PS3        | 🔴 Pathogenic|

## 🔬 Detailed Analysis
[Structured sections with citations]

## 🏥 Clinical Recommendations  
[Specific, actionable — not generic]

## ⚠ Limitations
[What we DON'T know, caveats]

## 📚 Sources
[Numbered references with links]
```

#### 3.3 Citation Verification

**Karna hai**:
- Report mein har major claim ke saath `[1]`, `[2]` style citations lagao
- End mein references section mein actual PubMed IDs / URLs dalo
- Ye report ko **academically credible** banata hai

> **Effort**: Medium — ~2-3 weeks  
> **Impact**: High — ye clinicians ka trust build karega

---

## Evaluation Plan — Kya Measure Karenge

### Primary Metrics (Paper Mein Jaayega)

| Metric | Kya Measure Karega | Target |
|--------|---------------------|--------|
| **VUS Reclassification Accuracy** | Kitne VUS variants sahi predict kiye | >75% |
| **Sensitivity** | Pathogenic variants miss nahi hone chahiye | >85% |
| **Specificity** | Benign variants ko galat pathogenic nahi bolna chahiye | >80% |
| **Time Advantage** | ClinVar update se kitne months pehle predict kiya | >6 months |
| **Hallucination Rate** | Report mein kitne % claims unsupported hain | <10% |

### Ablation Studies (Paper Ko Strong Banayega)

Ye experiments batayenge ki pipeline ka kaunsa part kitna contribute karta hai:

| Experiment | Kya Hataoge | Kya Dekhoge |
|------------|-------------|-------------|
| Evo2 Only | RAG hatao | Accuracy drop kitna? |
| RAG Only | Evo2 hatao | Accuracy drop kitna? |
| Generic Embeddings | BiomedBERT hatao | Retrieval quality drop? |
| No Re-ranking | Cross-encoder hatao | Report quality drop? |
| No Reviewer | Self-correction hatao | Hallucination rate badhta? |
| No Evidence Grading | ACMG grading hatao | Confidence accuracy drop? |

### Comparison Baselines

Apne system ko in existing tools se compare karo:

| Tool | Kya Karta Hai |
|------|---------------|
| **CADD** | Variant deleteriousness scoring |
| **REVEL** | Ensemble missense variant prediction |
| **AlphaMissense** | DeepMind ka protein-structure-based predictor |
| **InterVar** | ACMG-based automated classification |
| **ClinVar VUS baseline** | "Hume nahi pata" (ye beat karna easy hai) |

---

## Team Workflow — Kaun Kya Karega

| Role | Focus Area | Deliverables |
|------|------------|--------------|
| **Person 1** | VUS Benchmark Dataset | ClinVar historical data, 200-500 curated variants, train/test split |
| **Person 2** | Pipeline Development | Vector store, evidence grading, reviewer node, hallucination check |
| **Person 3** | Evaluation & Paper | Metrics computation, ablation studies, comparison with baselines, paper writing |

### Timeline Suggestion

```
Week 1-2:   Phase 1 (Easy Wins) — Vector store + domain embeddings + re-ranking
Week 3-4:   Dataset curation — VUS benchmark dataset banana
Week 5-8:   Phase 2 (Core) — Combined scoring, ACMG grading, reviewer node
Week 9-10:  Phase 3 (Polish) — Hallucination detection, report template, citations  
Week 11-12: Evaluation — Ablation studies, baseline comparisons, paper draft
```

---

## Tools & Infrastructure Recommendations

| Tool | Purpose | Free? |
|------|---------|-------|
| **ChromaDB** | Vector store (persistent, lightweight) | ✅ |
| **PubMedBERT** (`microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract`) | Domain embeddings | ✅ |
| **LangSmith** | LangGraph tracing & observability | ✅ (free tier) |
| **ClinVar FTP** (`ftp.ncbi.nlm.nih.gov/pub/clinvar/`) | Historical variant data | ✅ |
| **SQLite** | Pipeline run logging for experiments | ✅ |
| **Weights & Biases** | Experiment tracking | ✅ (free tier) |

---

## Paper Submission Targets

| Journal/Conference | Kyun Fit Hai | Impact |
|---------------------|-------------|--------|
| **Genome Medicine** | VUS reclassification + clinical utility | 🔥 High IF |
| **Bioinformatics (Oxford)** | Methods paper — RAG pipeline | 🔥 High IF |
| **BMC Genomics** | Comprehensive genomic tool paper | Good IF |
| **AAAI / NeurIPS (Workshop)** | LLM + RAG for healthcare | High visibility |
| **AMIA Annual Symposium** | Clinical informatics focus | Perfect fit |

---

> **Summary**: Ek unified research — VUS reclassification core hai, domain embeddings + evidence grading + hallucination detection + readable reports sab naturally fit hote hain. 12 weeks mein publishable paper ready ho sakta hai. Start karo **VUS benchmark dataset** se — woh sabse pehla aur sabse important step hai.
