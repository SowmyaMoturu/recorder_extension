def ui_element_semantic_key(elem):
    parts = []
    for attr in ["id", "class", "name", "aria-label", "placeholder"]:
        if elem.get(attr):
            parts.append(elem[attr])
    if elem.get("text"):
        parts.append(elem["text"])
    # If you have label associations, add them too
    return " ".join(parts).lower()
