# GeneScribe

GeneScribe is an AI-driven precision medicine platform that delivers instant, evidence-backed clinical reports for genomic variants. The project focuses on resolving Variants of Uncertain Significance (VUS) by combining genomic foundation models, retrieval-augmented generation, and multi-agent validation.

## Overview

Nearly half of detected genetic variants remain unclassified, which delays diagnosis and treatment. GeneScribe reduces that delay by producing traceable, evidence-supported variant interpretations in seconds.

## Key Features

- Evo-2 foundation model: Treats DNA like a language to detect functional effects in coding and non-coding regions.
- Retrieval-Augmented Generation (RAG): Fetches supporting evidence from PubMed, ClinVar, Ensembl and other sources.
- LangGraph arbiter: Multi-agent synthesis and consensus formation validated against ACMG/AMP criteria.
- Self-correcting reviewer loop: Detects and corrects model hallucinations for higher trustworthiness.
- Serverless deployment-ready: Designed for Modal (NVIDIA H100) and a Next.js 15 frontend for scale and speed.

## Impact

- Processing time: reduced from weeks to about 12 seconds per variant report.
- Performance: approximately 92% accuracy, 95% specificity, and 89% sensitivity in test cases.
- Example case: BRAP variant rs3782886 classified as High Risk in a case study.

## System Architecture

- Frontend: Next.js 15 with TypeScript.
- Backend: FastAPI serving the RAG pipelines and model endpoints.
- AI Engine: Evo-2 genomic foundation model (StripedHyena family).
- Data layer: ChromaDB plus curated sources such as ClinVar, PubMed and Ensembl.
- Orchestration: LangGraph multi-agent arbiter and a reviewer verification loop.

## Quick Start

1. See `variant-analysis-evo2/SETUP.md` for detailed setup and environment notes.
2. Install backend dependencies:

```bash
pip install -r variant-analysis-evo2/evo2-backend/requirements.txt
```

3. Install frontend dependencies and run the UI:

```bash
cd variant-analysis-evo2/evo2-frontend
npm install
npm run dev
```

4. Run the backend API (development):

```bash
uvicorn variant-analysis-evo2.evo2-backend.main:app --reload
```

For GPU deployment on Modal and production instructions, see `variant-analysis-evo2/DEPLOY_TO_MODAL.md`.

## Repository Layout

- `variant-analysis-evo2/` - core application and model code
	- `evo2-backend/` - FastAPI backend and orchestration
	- `evo2/` - Evo-2 model package and utilities
	- `evo2-frontend/` - Next.js 15 frontend

## Contributing

Contributions are welcome. The core team includes Abhijeet Shakya, Ajitesh Shukla, Yashswani Soni, Mridul Jha, Priyanshu Yadav, and Mukul Choudhary. Please open an issue or a pull request to propose changes.

## Ethics and Safety

GeneScribe is intended as a clinical-assist tool and not as a substitute for licensed medical judgment. The platform emphasizes evidence traceability, reviewer workflows, and audit logging to minimize incorrect outputs.

## License

No license specified. Contact the maintainers to discuss licensing and contribution terms.

## Contact

For questions or collaboration, open an issue or contact the project maintainers listed in the repository.
