import json
from typing import List, Dict, Tuple
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# Placeholder embedding function (replace with your Claude wrapper call)
def get_embedding(text: str) -> np.ndarray:
    # TODO: call Claude API embedding endpoint here, return vector as np.ndarray
    # For demo, use random vector (replace this)
    np.random.seed(hash(text) % (2**32))
    return np.random.rand(768)

def flatten_json(y, prefix=''):
    # Flatten nested JSON to key:value string pairs, key paths joined by dots
    out = {}
    def flatten(x, name=''):
        if type(x) is dict:
            for a in x:
                flatten(x[a], f'{name}{a}.')
        elif type(x) is list:
            for i, a in enumerate(x):
                flatten(a, f'{name}{i}.')
        else:
            out[name[:-1]] = str(x)
    flatten(y, prefix)
    return out

def embed_ui_elements(ui_elements: List[Dict]) -> List[Tuple[str, np.ndarray]]:
    # ui_elements: list of dicts with 'label' or 'text' keys
    embeddings = []
    for elem in ui_elements:
        text = elem.get('label') or elem.get('text') or ''
        emb = get_embedding(text)
        embeddings.append((text, emb))
    return embeddings

def embed_api_fields(api_json: Dict) -> List[Tuple[str, np.ndarray]]:
    flat = flatten_json(api_json)
    embeddings = []
    for k, v in flat.items():
        text = f"{k}: {v}"
        emb = get_embedding(text)
        embeddings.append((text, emb))
    return embeddings

def match_ui_to_api(ui_embeddings: List[Tuple[str, np.ndarray]], api_embeddings: List[Tuple[str, np.ndarray]], top_k=3):
    results = []
    api_vecs = np.array([emb for _, emb in api_embeddings])
    for ui_text, ui_emb in ui_embeddings:
        sims = cosine_similarity([ui_emb], api_vecs)[0]
        top_indices = sims.argsort()[-top_k:][::-1]
        top_matches = [(api_embeddings[i][0], sims[i]) for i in top_indices]
        results.append({
            "ui_element": ui_text,
            "top_api_matches": top_matches
        })
    return results

# === Example usage ===

if __name__ == "__main__":
    ui_elements = [
        {"label": "Product Name: Samsung galaxy s6"},
        {"label": "Price"},
        {"label": "Add to Cart Button"}
    ]

    api_response = {
        "cart": {
            "items": [
                {"name": "Samsung galaxy s6", "price": 350},
                {"name": "iPhone X", "price": 900}
            ],
            "total": 350
        },
        "user": {"id": 1234}
    }

    ui_emb = embed_ui_elements(ui_elements)
    api_emb = embed_api_fields(api_response)
    matches = match_ui_to_api(ui_emb, api_emb)

    print(json.dumps(matches, indent=2))
