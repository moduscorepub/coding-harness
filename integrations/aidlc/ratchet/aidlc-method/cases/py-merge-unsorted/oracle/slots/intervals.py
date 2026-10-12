def merge(intervals):
    """Merge overlapping or touching [start, end] intervals; the result is sorted by start."""
    merged = []
    for start, end in sorted(intervals, key=lambda interval: interval[0]):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged
