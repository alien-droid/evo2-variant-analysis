import modal

# Create image and install evo2 from local directory instead of cloning
evo2_image = (
    modal.Image.from_registry("nvidia/cuda:12.4.0-devel-ubuntu22.04", add_python="3.12")
    .apt_install([
        "build-essential", "cmake", "ninja-build", "libcudnn8", "libcudnn8-dev",
        "git", "gcc", "g++"
    ])
    .env({
        "CC": "/usr/bin/gcc",
        "CXX": "/usr/bin/g++",
    })
    .add_local_dir("evo2", remote_path="/evo2",ignore=["*.venv","*.ipynb"], copy=True)
    #.pip_install_local("evo2")  # Install from local directory
    .run_commands("cd /evo2 && pip install .")
    .run_commands("pip uninstall -y transformer-engine transformer_engine")
    .run_commands("pip install 'transformer_engine[pytorch]==1.13' --no-build-isolation")
    .pip_install_from_requirements("requirements.txt")
)

# Define Modal App
app = modal.App("evo2-variant-analysis", image=evo2_image)

# Set up HuggingFace cache volume
volume = modal.Volume.from_name("hf_cache", create_if_missing=True)
mount_path = "/root/.cache/huggingface"


@app.function(gpu="H100", volumes={mount_path: volume}, timeout=1000)
def run_brca1_analysis():
    # copied from the evo2 example brca1 notebook
    import base64
    from io import BytesIO
    from Bio import SeqIO
    import gzip
    import matplotlib.pyplot as plt
    import numpy as np
    import pandas as pd
    import seaborn as sns
    from sklearn.metrics import roc_auc_score, roc_curve
    from evo2 import Evo2

    WINDOW_SIZE = 8192
    print("Loading evo2 model...")
    model = Evo2("evo2_7b")
    print("Evo2 model loaded")

    brca1_df = pd.read_excel(
        "/evo2/notebooks/brca1/41586_2018_461_MOESM3_ESM.xlsx",
        header=2,
    )
    brca1_df = brca1_df[[
        "chromosome", "position (hg19)", "reference", "alt",
        "function.score.mean", "func.class",
    ]]
    brca1_df.rename(columns={
        "chromosome": "chrom",
        "position (hg19)": "pos",
        "reference": "ref",
        "alt": "alt",
        "function.score.mean": "score",
        "func.class": "class",
    }, inplace=True)
    brca1_df["class"] = brca1_df["class"].replace(["FUNC", "INT"], "FUNC/INT")

    with gzip.open("/evo2/notebooks/brca1/GRCh37.p13_chr17.fna.gz", "rt") as handle:
        seq_chr17 = next(SeqIO.parse(handle, "fasta")).seq

    ref_seqs, var_seqs, ref_seq_indexes = [], [], []
    ref_seq_to_index = {}

    brca1_subset = brca1_df.iloc[:500].copy() # only use first 500 variants

    for _, row in brca1_subset.iterrows():
        p = row["pos"] - 1
        ref_seq_start = max(0, p - WINDOW_SIZE // 2)
        ref_seq_end = min(len(seq_chr17), p + WINDOW_SIZE // 2)
        ref_seq = seq_chr17[ref_seq_start:ref_seq_end]
        snv_pos_in_ref = min(WINDOW_SIZE // 2, p)
        var_seq = ref_seq[:snv_pos_in_ref] + row["alt"] + ref_seq[snv_pos_in_ref + 1:]

        if ref_seq not in ref_seq_to_index:
            ref_seq_to_index[ref_seq] = len(ref_seqs)
            ref_seqs.append(str(ref_seq))

        ref_seq_indexes.append(ref_seq_to_index[ref_seq])
        var_seqs.append(str(var_seq))

    ref_seq_indexes = np.array(ref_seq_indexes)

    print(f"Scoring {len(ref_seqs)} reference sequences...")
    ref_scores = model.score_sequences(ref_seqs)
    print(f"Scoring {len(var_seqs)} variant sequences...")
    var_scores = model.score_sequences(var_seqs)

    delta_scores = np.array(var_scores) - np.array(ref_scores)[ref_seq_indexes]
    brca1_subset["evo2_delta_score"] = delta_scores

    # calculate the optimal threshold (based on the ROC curve, Youden's J statistic)
    y_true = brca1_subset["class"] == "LOF"
    auroc = roc_auc_score(y_true, -brca1_subset["evo2_delta_score"])
    
    fpr, tpr, thresholds = roc_curve(y_true, -brca1_subset["evo2_delta_score"])
    optimal_idx = (tpr - fpr).argmax()
    optimal_threshold = -thresholds[optimal_idx]

    lof_scores = brca1_subset.loc[brca1_subset["class"] == "LOF", "evo2_delta_score"]
    func_scores = brca1_subset.loc[brca1_subset["class"] == "FUNC/INT", "evo2_delta_score"]
   
    confidence_params = {
        "threshold": optimal_threshold,
        "lof_std": lof_scores.std(),
        "func_std": func_scores.std()
    }
    print("Confidence parameters:", confidence_params)

    plt.figure(figsize=(4, 2))
    p = sns.stripplot(
        data=brca1_subset,
        x="evo2_delta_score",
        y="class",
        hue="class",
        order=["FUNC/INT", "LOF"],
        palette=["#777777", "C3"],
        size=2,
        jitter=0.3,
    )
    sns.boxplot(
        showmeans=True,
        meanline=True,
        meanprops={"visible": False},
        medianprops={"color": "k", "ls": "-", "lw": 2},
        whiskerprops={"visible": False},
        zorder=10,
        x="evo2_delta_score",
        y="class",
        data=brca1_subset,
        showfliers=False,
        showbox=False,
        showcaps=False,
        ax=p,
    )
    plt.xlabel("Delta likelihood score, Evo 2")
    plt.ylabel("BRCA1 SNV class")
    plt.tight_layout()

    buffer = BytesIO()
    plt.savefig(buffer, format="png")
    buffer.seek(0)
    plot_data = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return {
        "variants": brca1_subset.to_dict(orient="records"),
        "plot": plot_data,
        "auroc": auroc,
    }


@app.function()
def run_BRCA1_example():
    import base64
    from io import BytesIO
    import matplotlib.pyplot as plt
    import matplotlib.image as mpimg

    print("Running BRCA1 example on Modal GPU...")
    returns = run_brca1_analysis.remote()

    # plot results
    if returns["plot"] is not None:
        plt_data = base64.b64decode(returns["plot"])
        with open("brca_analysis_plot.png", "wb") as f:
            f.write(plt_data)
        
        img = mpimg.imread(BytesIO(plt_data))
        plt.figure(figsize=(10, 5))
        plt.imshow(img)
        plt.axis("off")
        plt.show()


def get_genome_sequence(genome: str, chromosome: str, pos: int, window_size: int = 8192):
    # get the sequence from the genome
    import requests
    half_window = window_size // 2
    pos = pos - 1
    start = max(0, pos - half_window)
    end = pos + half_window + 1

    print(f'Fetching sequence from {genome} for {chromosome}:{start}-{end} with window size {window_size}')

    # Fetching the genome sequence based on start-end
    url = f"https://api.genome.ucsc.edu/getData/sequence?genome={genome};chrom={chromosome};start={start};end={end}"
    response = requests.get(url)
    if response.status_code != 200:  # Checking the status code
        raise Exception(f"Error fetching sequence from {url}: {response.text}")

    genome_sequence = response.json()
    if "dna" not in genome_sequence: # checking if there is no error in the response
        error = response.json()["error"]
        raise Exception(f"Error fetching sequence from {url}: {error}")
    
    sequence = genome_sequence["dna"].upper() # converting the sequence to uppercase
    if len(sequence) != (end - start): # checking if the sequence length is equal to the expected length (start-end)
        print(f"Warning: sequence length is not equal to the window size. Expected {end - start}, got {len(sequence)}")
    
    print(f"Fetched sequence from {genome} for {chromosome}:{start}-{end} with window size {window_size}")
    return sequence, start

# window_seq - the sequence of the window around the variant
# relative_pos - the position of the variant relative to the start of the window
# reference - the reference genome sequence
# alt - the alternative genome nucleotide
# model - the Evo2 model
def analyse_variant(relative_pos:int, window_seq: str, reference: str, alt: str, model):
    print(f"Reference: {reference}")
    var_seq = window_seq[:relative_pos] + alt + window_seq[relative_pos + 1:]

    # scores for the reference and variant
    ref_score = model.score_sequences([window_seq])[0]
    var_score = model.score_sequences([var_seq])[0]

    delta_score = var_score - ref_score
    # Confidence parameters: {'threshold': np.float32(-0.0009178519), 'lof_std': np.float32(0.0015140239), 'func_std': np.float32(0.0009016589)}
    # to calculate the threshold, we need to find the point on the ROC curve using the BRCA1 dataset (example)

    threshold = -0.0009178519
    lof_std = 0.0015140239
    func_std = 0.0009016589

    if delta_score < threshold:
        prediction = "Likely pathogenic"
        confidence = min(1, abs(delta_score - threshold) / lof_std)
    else:
        prediction = "Likely benign"
        confidence = min(1, abs(delta_score - threshold) / func_std)
    
    return {
        "prediction": prediction,
        "classification_conf": float(confidence),
        "delta_score": float(delta_score),
        "reference": reference,
        "alternative": alt,
    }




@app.cls(gpu="H100", volumes={mount_path: volume}, retries=2, max_containers=3, scaledown_window=120)
class Evo2:
    @modal.enter()
    def load_evo2_model(self):
        from evo2 import Evo2
        print("Loading evo2 model...")
        self.model = Evo2("evo2_7b")
        print("Evo2 model loaded")

    # chromosome - which chromosome to use
    # genome - which genome are we using (like human, mouse, etc)
    # alt - the alternative nucleotide
    # variant_pos - the position of the variant
    #
    #@modal.method()
    @modal.fastapi_endpoint(method="POST")
    def analyse_single_variant(self, variant_pos: int, genome: str, alt: str, chromosome: str):
        print(f"Analyse variant at {variant_pos} on {chromosome} with {alt} in {genome}")
        WINDOW_SIZE = 8192

        window_seq, seq_start = get_genome_sequence(genome, chromosome, variant_pos, window_size=WINDOW_SIZE)
        print(f"Window sequence: {window_seq}")
        print(f"Sequence start: {seq_start}")

        relative_pos = variant_pos - 1 - seq_start
        if relative_pos < 0 or relative_pos >= len(window_seq):
            raise ValueError(f"Variant position {variant_pos} is outside the window of {chromosome}:{seq_start}-{seq_start + len(window_seq)}")
        
        reference = window_seq[relative_pos]
        print(f"Reference: {reference}")
        # score the reference sequence
        result = analyse_variant(relative_pos, window_seq, reference, alt, self.model)
        result["position"] = variant_pos
        return result




@app.local_entrypoint()
def main():
    #run_BRCA1_example.local()
    evo2Model = Evo2()
    result = evo2Model.analyse_single_variant.remote(variant_pos=43119628, genome="hg38", alt="G", chromosome="chr17")
    
    print(result)
