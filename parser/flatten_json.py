def flatten_json(y, prefix=''):
    """
    Flatten JSON dict to dict with dot/bracket notation keys.
    """
    out = {}

    if isinstance(y, dict):
        for k, v in y.items():
            new_key = f"{prefix}.{k}" if prefix else k
            out.update(flatten_json(v, new_key))
    elif isinstance(y, list):
        for i, v in enumerate(y):
            new_key = f"{prefix}[{i}]"
            out.update(flatten_json(v, new_key))
    else:
        out[prefix] = y
    return out
