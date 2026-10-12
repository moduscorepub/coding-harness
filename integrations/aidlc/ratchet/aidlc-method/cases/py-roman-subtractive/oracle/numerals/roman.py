VALUES = [
    (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"), (90, "XC"),
    (50, "L"), (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I"),
]


def to_roman(number):
    """Roman numeral for 1..3999, in subtractive notation (IV, IX, XL, XC, CD, CM)."""
    if not 1 <= number <= 3999:
        raise ValueError("roman numerals cover 1..3999")
    out = []
    for value, symbol in VALUES:
        while number >= value:
            out.append(symbol)
            number -= value
    return "".join(out)
