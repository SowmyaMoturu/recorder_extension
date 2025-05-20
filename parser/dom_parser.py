from bs4 import BeautifulSoup

def parse_dom_snapshot(html_content):
    """
    Parses a DOM snapshot HTML string.
    Returns list of elements with tag, id, classes, text snippet.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    elements_metadata = []

    def recurse(element, level=0):
        # Ignore script/style tags or invisible elements
        if element.name in ['script', 'style', '[document]', 'head', 'meta', 'title']:
            return
        # Extract meaningful text, stripped and truncated
        text = element.get_text(strip=True)
        if text:
            text = text[:100]  # truncate to 100 chars
        else:
            text = ""

        metadata = {
            "tag": element.name,
            "id": element.get('id', ''),
            "class": " ".join(element.get('class', [])),
            "name": element.get('name', ''),
            "aria": {k: v for k, v in element.attrs.items() if k.startswith('aria-')},
            "text": text,
            "level": level
        }
        elements_metadata.append(metadata)
        # Recurse children
        for child in element.children:
            if hasattr(child, 'name'):  # is Tag
                recurse(child, level+1)

    recurse(soup.body or soup)
    return elements_metadata
