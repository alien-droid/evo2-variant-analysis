# 🧬 Gene Variant Pathogenicity Predictor

An analysis application that allows users to simulate **single-nucleotide variations (SNVs)** in genes and predict whether they are **“likely benign”** or **“likely pathogenic”**, using the **Evo2 LLM Model**.

---

## 🚀 Overview

This project consists of:

- A **modified Evo2 LLM** tokenizer for efficient inference with SNVs.
- A **Next.js frontend** to display gene information, allow input of nucleotide changes, and view predictions.
- Deployment to a **Modal container**, bundling the Evo2 model with custom tweaks.

---

## 🧪 Functionality

- View gene details and reference sequences.
- Introduce a single-nucleotide variation in the sequence.
- Predict the impact of that mutation using the Evo2 LLM.
- Classify the result as:
  - `Likely Benign`
  - `Likely Pathogenic`

---

## 🛠️ Modifications

After cloning the original [Evo2 repository](https://github.com/instadeepai/evo-llm), a small change was made in the tokenizer:

```python
# File: vortex/model/tokenizer.py (under CharLevelTokenizer)

def tokenize(self, text: str):
    return list(np.frombuffer(text.encode("utf-8"), dtype=np.uint8))
```

The updated Evo2 directory is added to the Modal container with (as mentioned under main.py):
```python
.add_local_dir("evo2", remote_path="/evo2", ignore=["*.venv", "*.ipynb"], copy=True)
```

## 🧱 Tech Stack

- **Next.js** – frontend UI for sequence interaction

- **Python (with Modal)** – model backend for Evo2 inference

- **Evo2 LLM** – large language model for protein/nucleotide analysis [<img src="https://img.icons8.com/?size=25&id=467&format=png&color=ffffff">](https://github.com/ArcInstitute/evo2)

- **NumPy, Pandas, FastAPI, Matplotlib** – backend utility libraries

## 📦 Setup & Usage

1. Clone and install dependencies (from their respective directories)

2. Modify the Evo2 tokenizer (already included if using this repo)
Check that vortex/model/tokenizer.py has the updated tokenize method

3. Run locally (Modal / Backend):
```bash
cd backend/
modal init 
modal run main.py
``` 

4. Start the Next.js frontend:
```bash
cd frontend/
npm run dev
```
