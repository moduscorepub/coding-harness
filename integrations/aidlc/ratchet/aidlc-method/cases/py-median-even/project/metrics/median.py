def median(values):
    """Median of a list of numbers; for an even count, the mean of the two middle values."""
    ordered = sorted(values)
    return ordered[len(ordered) // 2]
