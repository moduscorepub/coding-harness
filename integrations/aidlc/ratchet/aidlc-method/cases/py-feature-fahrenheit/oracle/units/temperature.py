ABSOLUTE_ZERO_C = -273.15


def to_celsius(fahrenheit):
    """Degrees Celsius for degrees Fahrenheit, rounded to one decimal place."""
    return round((fahrenheit - 32) * 5 / 9, 1)


def to_fahrenheit(celsius):
    """Degrees Fahrenheit for degrees Celsius, rounded to one decimal place."""
    if celsius < ABSOLUTE_ZERO_C:
        raise ValueError("below absolute zero")
    return round(celsius * 9 / 5 + 32, 1)
