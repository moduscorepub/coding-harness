def first(items, default=None):
    """The first item, or default for an empty list."""
    return items[0] if items else default


def chunk(items, size):
    """Consecutive lists of at most size items; size below 1 raises ValueError."""
    if size < 1:
        raise ValueError("size must be at least 1")
    return [items[start:start + size] for start in range(0, len(items), size)]
