def median(values):
    """Median of a list of numbers; for an even count, the mean of the two middle values."""
    if not values:
        raise ValueError("median of an empty list")
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2 == 0:
        return (ordered[middle - 1] + ordered[middle]) / 2
    return ordered[middle]
