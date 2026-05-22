# 🧬 EVO2 Variant Analysis — Project Demo Script

**Project Name:** EVO2 Variant Analysis  
**Author:** Priyanshu Yadav  
**Date:** February 2026  
**Duration:** ~15–20 minutes

---

## 📌 SLIDE 1 — Title & Introduction

> *"Good morning/afternoon everyone. My name is Priyanshu Yadav, and today I'm going to present my project — **EVO2 Variant Analysis** — an AI-powered web application that predicts how dangerous DNA mutations are, using the state-of-the-art Evo2 large language model."*

---

## 📌 SLIDE 2 — The Problem Statement

> *"Let me start with the problem we're solving."*

- DNA is made of 4 bases: **A, T, G, C**. Small changes in these bases are called **mutations** or **variants**.
- Some mutations are **harmless** (benign), but some can cause serious diseases like **cancer**.
- For example, mutations in the **BRCA1** gene are strongly linked to **breast and ovarian cancer**.
- Doctors and researchers currently rely on **manual databases** (like ClinVar) to check if a mutation is dangerous — but:
  - Many variants are labeled **"VUS" (Variant of Uncertain Significance)** — meaning we **don't know** if they're dangerous.
  - New mutations are discovered **daily**, and databases can't keep up.

> *"This is where our project comes in. We use an AI model called **Evo2** — a 40-billion parameter DNA language model — to **predict** whether a mutation is pathogenic (disease-causing) or benign, even for variants that have never been classified before."*

---

## 📌 SLIDE 3 — Project Overview & Objectives

> *"The objective of this project is to build an end-to-end web application that:"*

1. **Allows users** to select a human genome assembly (e.g., hg38) and browse genes
2. **Displays** the reference DNA sequence of any gene (fetched from the UCSC Genome Browser API)
3. **Lists known variants** from the NCBI ClinVar database with their existing classifications
4. **Predicts pathogenicity** of any single nucleotide variant using the **Evo2-40B** AI model via NVIDIA's hosted API
5. **Compares** AI predictions against existing ClinVar classifications
6. **Generates clinical reports** using a multi-agent LangGraph pipeline with evidence from Ensembl, ClinVar, PubMed, Exa, and Tavily

---

## 📌 SLIDE 4 — System Architecture

> *"Let me walk you through the architecture."*

```
┌──────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                       │
│  React 19  •  TypeScript  •  Tailwind CSS  •  Shadcn UI     │
│  Port: 3000                                                  │
└────────────────────────┬─────────────────────────────────────┘
                         │  HTTP REST API
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                         │
│  Python  •  Uvicorn  •  Port: 8000                           │
│                                                              │
│  ┌─────────────────┐  ┌──────────────────────────────────┐   │
│  │ /analyze-variant │  │ /analyze-clinical-context        │   │
│  │                  │  │                                  │   │
│  │ 1. Fetch genome  │  │ LangGraph Genomic Arbiter:       │   │
│  │    from UCSC API │  │ ┌──────────┐  ┌──────────────┐  │   │
│  │ 2. Score with    │  │ │ Ensembl  │  │ ClinVar      │  │   │
│  │    EVO2 (NVIDIA) │  │ │ Lookup   │→ │ Discovery    │  │   │
│  │ 3. Classify      │  │ └──────────┘  └──────┬───────┘  │   │
│  │    LOF / FUNC    │  │                      ▼          │   │
│  └─────────────────┘  │ ┌──────────────────────────────┐ │   │
│                        │ │ Clinical Audit + Router      │ │   │
│                        │ └──────────┬───────────────────┘ │   │
│                        │            ▼                     │   │
│                        │ ┌──────────────────────────────┐ │   │
│                        │ │ Conflict Resolution          │ │   │
│                        │ │ (PubMed + Exa + Tavily)      │ │   │
│                        │ └──────────┬───────────────────┘ │   │
│                        │            ▼                     │   │
│                        │ ┌──────────────────────────────┐ │   │
│                        │ │ Synthesis + Recommendations  │ │   │
│                        │ │ (Groq LLM: Qwen3-32B)       │ │   │
│                        │ └──────────────────────────────┘ │   │
│                        └──────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐  ┌───────────┐  ┌──────────────┐
    │ UCSC API │  │ NVIDIA    │  │ NCBI/ClinVar │
    │ (Genome) │  │ EVO2 API  │  │ E-utilities  │
    └──────────┘  └───────────┘  └──────────────┘
```

---

## 📌 SLIDE 5 — Technology Stack

> *"Here's the complete technology stack used in this project."*

### Frontend
| Technology      | Purpose                              |
|-----------------|--------------------------------------|
| Next.js 15      | React framework with SSR support     |
| React 19        | UI component library                 |
| TypeScript      | Type-safe JavaScript                 |
| Tailwind CSS 4  | Utility-first CSS framework          |
| Shadcn UI       | Pre-built accessible components      |
| Lucide React    | Icon library                         |

### Backend
| Technology      | Purpose                              |
|-----------------|--------------------------------------|
| Python 3.13     | Backend programming language         |
| FastAPI         | High-performance REST API framework  |
| Uvicorn         | ASGI server                          |
| LangGraph       | Multi-agent AI pipeline orchestrator |
| LangChain       | LLM framework for tool integration   |
| Groq (Qwen3-32B)| LLM for clinical report synthesis   |
| Pydantic        | Data validation and serialization    |

### External APIs
| API             | Purpose                              |
|-----------------|--------------------------------------|
| NVIDIA EVO2 API | Evo2-40B model for variant scoring   |
| UCSC Genome API | Fetching reference DNA sequences     |
| NCBI E-utilities| ClinVar variant data                 |
| Ensembl REST API| Gene coordinate lookup               |
| PubMed          | Medical research papers              |
| Exa Search      | AI-powered scientific search         |
| Tavily Search   | Deep web search for genomics data    |

### Deployment (Optional)
| Technology      | Purpose                              |
|-----------------|--------------------------------------|
| Modal           | Serverless GPU (H100) deployment     |

---

## 📌 SLIDE 6 — How Evo2 Works (The AI Model)

> *"Now let me explain the AI model at the heart of this project."*

- **Evo2** is a **40-billion parameter** DNA language model developed by the **Arc Institute**.
- It is trained on **9.3 trillion DNA tokens** — essentially the model has "read" an enormous amount of genomic data.
- It works like GPT, but instead of predicting the **next word**, it predicts the **next DNA base** (A, T, G, or C).

### How We Use It for Variant Scoring:
```
Step 1: Take the DNA sequence BEFORE the mutation position
        e.g., ...ATGCGATCGATCGATCGATCG...
                                          ↑ mutation position

Step 2: Feed this context to Evo2 → model predicts what base SHOULD come next

Step 3: Compare model's prediction:
        - Log-probability of Reference allele (e.g., "A")  = -0.12
        - Log-probability of Alternative allele (e.g., "G") = -2.85

Step 4: Delta Score = log_prob(alt) - log_prob(ref)
        Delta = -2.85 - (-0.12) = -2.73

Step 5: Classification:
        If delta < -0.5  →  LOF (Loss of Function) = Potentially Pathogenic
        If delta >= -0.5 →  FUNC (Functional)      = Likely Benign
```

> *"In simple terms: if the AI model finds that the mutated base is very unexpected at that position, the variant is likely disease-causing."*

---

## 📌 SLIDE 7 — LangGraph Genomic Arbiter Pipeline

> *"Beyond just AI scoring, we also built a multi-agent clinical analysis pipeline using LangGraph."*

### Pipeline Nodes:

| Node | Name                     | What It Does                                                |
|------|--------------------------|-------------------------------------------------------------|
| 1    | **Grounding Node**       | Looks up gene coordinates on Ensembl (chromosome, position) |
| 2    | **Discovery Node**       | Searches ClinVar for known variants of the gene             |
| 3    | **Clinical Audit Node**  | Fetches detailed pathogenicity info, filters for high-priority variants |
| 4    | **Conflict Resolution**  | If VUS vs FUNC discrepancy exists → queries PubMed, Exa, Tavily for 2026 research |
| 5    | **Synthesis Node**       | Uses Qwen3-32B LLM to write a structured clinical report   |
| 6    | **Actionability Node**   | Generates clinical recommendations + confidence score (1-10) |

### Output:
- A **comprehensive clinical report** with gene overview, clinical relevance, conflicting evidence analysis
- **Actionable recommendations**: testing protocols, monitoring, therapeutic implications
- A **confidence score** (1-10) based on evidence quality
- Optionally, a **PDF export** of the entire report

---

## 📌 SLIDE 8 — Live Demo Walkthrough

> *"Now let me show you the live working of the application."*

### Step 1: Open the Application
- **Frontend** runs on `http://localhost:3000`
- **Backend** runs on `http://localhost:8000`

### Step 2: Select Genome Assembly
- Default is **hg38** (GRCh38/hg38) — the latest human genome assembly
- Organism: **Human**

### Step 3: Search for a Gene

**INPUT:**
```
Gene Symbol: BRCA1
```

> *"I'll type BRCA1 — this is the Breast Cancer gene 1. Mutations in BRCA1 are well-known to increase the risk of breast and ovarian cancer."*

- The app fetches gene details from NCBI
- Shows gene information: chromosome location, full name, description
- Loads the reference DNA sequence from UCSC API

### Step 4: View Reference Genome Sequence
- The app displays the **actual DNA sequence** (A, T, G, C) of the BRCA1 gene
- Each nucleotide is color-coded:
  - **A** = Green
  - **T** = Red  
  - **G** = Yellow
  - **C** = Blue
- The user can click on any position in the sequence to select it

### Step 5: Browse Known Variants
- The app loads known variants from **ClinVar** for BRCA1
- Each variant shows:
  - Position on the chromosome
  - Reference allele → Alternative allele
  - ClinVar classification (Pathogenic / Benign / VUS)
  - Clinical significance

### Step 6: Analyze a Variant with Evo2

**INPUT:**
```
Variant Position: 43045677 (on Chromosome 17)
Alternative Allele: G (instead of reference A)
Genome: hg38
Chromosome: chr17
```

> *"Now I'll click 'Analyze with Evo2' — this sends the request to our backend."*

**What happens behind the scenes:**
1. Backend fetches 8192bp window of DNA sequence from UCSC API
2. Extracts 1024bp context before the variant position
3. Sends context to NVIDIA's hosted Evo2-40B model
4. Gets back logits for all possible bases
5. Computes log-probabilities and delta score
6. Returns classification

**OUTPUT:**
```json
{
  "position": 43045677,
  "reference": "A",
  "alternative": "G",
  "evo2_score": -2.8541,
  "delta_score": -2.7339,
  "classification": "LOF"
}
```

| Field           | Value    | Meaning                                    |
|-----------------|----------|--------------------------------------------|
| position        | 43045677 | Genomic coordinate on chromosome 17        |
| reference       | A        | What the normal (reference) base is        |
| alternative     | G        | What the mutated base is                   |
| evo2_score      | -2.85    | Log-probability of the alternative allele  |
| delta_score     | -2.73    | Difference (alt - ref). Negative = damaging|
| classification  | LOF      | Loss of Function = Potentially Pathogenic  |

> *"The Evo2 model predicts this variant as **LOF (Loss of Function)**, meaning this mutation is potentially pathogenic — it could cause disease. The delta score of -2.73 indicates the model strongly disagrees with the mutation."*

### Step 7: Compare with ClinVar

> *"We can then compare our AI prediction against the existing ClinVar classification to see if they agree."*

| Source        | Classification   |
|---------------|------------------|
| **Evo2 AI**   | LOF (Pathogenic) |
| **ClinVar DB**| Pathogenic       |
| **Match?**    | ✅ Yes            |

### Step 8: Generate Clinical Context Report

**INPUT:**
```
Gene: BRCA1
Variant ID: 17610
Prediction: LOF
```

**OUTPUT (Clinical Report):**
```
=== Gene Overview ===
BRCA1 (BRCA1 DNA Repair Associated) is located on Chromosome 17 
(43044295-43170245), Forward strand. Ensembl ID: ENSG00000012048.

=== Clinical Relevance ===
BRCA1 pathogenic variants are associated with Hereditary Breast and 
Ovarian Cancer (HBOC) syndrome. Carriers have a 45-85% lifetime risk 
of breast cancer and 11-39% risk of ovarian cancer.

=== EVO2 Prediction Analysis ===
The Evo2-40B model classified this variant as Loss of Function (LOF),
consistent with ClinVar's Pathogenic classification.

=== Clinical Recommendations ===
1. Testing: Cascade genetic testing for first-degree relatives
2. Monitoring: Annual breast MRI starting age 25
3. Therapeutic: Consider PARP inhibitors if cancer develops
4. Counseling: Discuss risk-reducing surgical options

Confidence Score: 8.5/10
Sources: Ensembl, ClinVar, PubMed, Exa, Tavily
```

---

## 📌 SLIDE 9 — Input / Output Summary

### INPUTS (What the user provides):

| Input                | Example            | Description                        |
|----------------------|--------------------|------------------------------------|
| Genome Assembly      | hg38               | Human genome version               |
| Gene Symbol/Name     | BRCA1              | Gene to analyze                    |
| Variant Position     | 43045677           | Chromosomal coordinate of mutation |
| Alternative Allele   | G                  | The mutated DNA base               |

### OUTPUTS (What the system returns):

| Output                  | Example              | Description                          |
|-------------------------|----------------------|--------------------------------------|
| Reference Allele        | A                    | Original DNA base at that position   |
| EVO2 Score              | -2.8541              | AI model's log-probability           |
| Delta Score             | -2.7339              | Difference (negative = damaging)     |
| Classification          | LOF / FUNC           | Pathogenic or Benign prediction      |
| ClinVar Comparison      | Match / Mismatch     | Comparison with existing database    |
| Clinical Report         | Markdown report      | Synthesized clinical analysis        |
| Recommendations         | Structured text      | Actionable medical recommendations   |
| Confidence Score        | 8.5 / 10             | Evidence quality rating              |
| PDF Report (optional)   | .pdf file            | Exportable clinical document         |

---

## 📌 SLIDE 10 — Key Features Summary

1. **🧬 AI-Powered Variant Prediction** — Uses Evo2-40B (40 billion parameters) for zero-shot variant effect prediction
2. **⚖️ ClinVar Comparison View** — Side-by-side comparison of AI prediction vs. existing clinical classification
3. **🔬 Multi-Source Evidence Synthesis** — LangGraph pipeline pulls from 5+ sources (Ensembl, ClinVar, PubMed, Exa, Tavily)
4. **📋 Clinical Report Generation** — Automated clinical reports with recommendations using Qwen3-32B LLM
5. **🌍 Full Genome Browsing** — Browse any gene in the human genome, view reference DNA sequences
6. **📊 Confidence Scoring** — Evidence-based confidence score (1-10) for every analysis
7. **📄 PDF Export** — Export clinical reports as PDF documents
8. **⚡ GPU-Accelerated** — Can be deployed on H100 GPUs via Modal for production use

---

## 📌 SLIDE 11 — Challenges Faced

1. **Large Model Size** — Evo2-40B requires ~40GB+ VRAM; solved by using NVIDIA's hosted API
2. **API Rate Limits** — UCSC, ClinVar, and NVIDIA APIs have rate limits; implemented retry logic
3. **VUS Ambiguity** — Many variants have uncertain significance; solved with multi-source conflict resolution pipeline
4. **LLM Hallucination** — LLMs can generate inaccurate clinical info; mitigated by grounding responses in real database data
5. **Cross-Origin Issues** — Frontend-backend communication; solved with proper CORS middleware configuration

---

## 📌 SLIDE 12 — Future Scope

> *"Here are the improvements and extensions we plan for the future."*

### 1. 🧪 Multi-Variant Analysis (Batch Processing)
- Currently analyzes **one variant at a time**
- Future: Upload a **VCF file** (Variant Call Format) with thousands of variants and analyze all at once
- Useful for whole-genome sequencing data

### 2. 🧬 Support for Other Organisms
- Currently limited to **Human (hg38)** genome
- Future: Support for **model organisms** — Mouse (mm39), Rat, Zebrafish, Drosophila
- Evo2 is trained on multi-species data, so this is feasible

### 3. 🏥 Electronic Health Record (EHR) Integration
- Connect with hospital systems (HL7 FHIR standard)
- Automatically pull patient variant data and generate clinical reports
- Enable personalized medicine workflows

### 4. 📊 Advanced Visualization
- Interactive **3D protein structure** visualization showing where the mutation affects protein folding
- **Pathway diagrams** showing how the gene interacts with other genes
- **Population frequency** charts from gnomAD database

### 5. 🤖 Fine-Tuned Domain-Specific Models
- Fine-tune smaller LLMs specifically on genomic clinical reports
- Reduce dependency on general-purpose LLMs like Qwen3-32B
- Faster inference, more accurate clinical language

### 6. 📱 Mobile Application
- Build a responsive mobile app for genetic counselors and clinicians
- Push notifications for new variant classifications
- Offline mode for areas with limited connectivity

### 7. 🔒 Security & Compliance
- Implement **HIPAA compliance** for handling patient genetic data
- End-to-end encryption for variant data transmission
- Role-based access control (Clinician, Researcher, Patient)

### 8. 🌐 Collaborative Platform
- Allow researchers to share and discuss variant interpretations
- Community-driven variant classification with voting and consensus mechanisms
- Integration with ClinGen (Clinical Genome Resource)

### 9. 📈 Longitudinal Tracking
- Track how variant classifications change over time as new research emerges
- Alert users when a previously VUS variant gets reclassified as Pathogenic
- Historical audit trail for clinical decision-making

### 10. 🧠 Multi-Modal AI Analysis
- Combine DNA sequence analysis with **protein structure prediction** (AlphaFold)
- Integrate **gene expression data** (RNA-seq) for functional validation
- Use **epigenomic data** to understand regulatory variant effects

---

## 📌 SLIDE 13 — Conclusion

> *"To summarize:"*

- We built a **full-stack web application** that uses the **Evo2-40B DNA language model** to predict variant pathogenicity
- The system combines **AI predictions** with **multi-source clinical evidence** from real biomedical databases
- Our **LangGraph pipeline** automates the generation of clinical reports with actionable recommendations
- The project demonstrates the potential of **AI in precision medicine** — helping clinicians make faster, more informed decisions about genetic variants

> *"Thank you! I'm happy to take any questions."*

---

## 📌 APPENDIX — How to Run the Project

### Prerequisites
- Python 3.10+
- Node.js 18+
- API Keys (NVIDIA, Groq, Tavily, Exa) configured in `.env`

### Start Backend
```bash
cd evo2-backend
python -m venv .venv
source .venv/bin/activate          # Linux/Mac
pip install -r requirements.txt
python app.py
# → Server starts on http://localhost:8000
```

### Start Frontend
```bash
cd evo2-frontend
npm install
npm run dev
# → Server starts on http://localhost:3000
```

### API Endpoints
| Method | Endpoint                   | Description                    |
|--------|----------------------------|--------------------------------|
| GET    | `/health`                  | Health check & mode status     |
| GET    | `/models`                  | List available EVO2 models     |
| POST   | `/analyze-variant`         | Analyze a single DNA variant   |
| POST   | `/analyze-clinical-context`| Generate clinical report       |

### Sample API Call
```bash
curl -X POST http://localhost:8000/analyze-variant \
  -H "Content-Type: application/json" \
  -d '{
    "variant_position": 43045677,
    "alternative": "G",
    "genome": "hg38",
    "chromosome": "chr17"
  }'
```

---

## 📌 APPENDIX — References

1. **Evo2 Model Paper:** [bioRxiv - Evo2: Genome Modeling at Scale](https://www.biorxiv.org/content/10.1101/2025.02.18.638918v1)
2. **Evo2 GitHub:** [github.com/ArcInstitute/evo2](https://github.com/ArcInstitute/evo2)
3. **ClinVar Database:** [ncbi.nlm.nih.gov/clinvar](https://www.ncbi.nlm.nih.gov/clinvar/)
4. **UCSC Genome Browser:** [genome.ucsc.edu](https://genome.ucsc.edu/)
5. **Ensembl REST API:** [rest.ensembl.org](https://rest.ensembl.org/)
6. **LangGraph Documentation:** [langchain-ai.github.io/langgraph](https://langchain-ai.github.io/langgraph/)
7. **NVIDIA BioNeMo:** [build.nvidia.com](https://build.nvidia.com/)
