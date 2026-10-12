VALUES = [(1000, "M"), (500, "D"), (100, "C"), (50, "L"), (10, "X"), (5, "V"), (1, "I")]


def to_roman(number):
    """Roman numeral for 1..3999, in subtractive notation (IV, IX, XL, XC, CD, CM)."""
    out = []
    for value, symbol in VALUES:
        while number >= value:
            out.append(symbol)
            number -= value
    return "".join(out)
