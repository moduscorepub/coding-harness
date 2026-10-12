from decimal import ROUND_HALF_UP, Decimal


def tax_cents(amount_cents, rate_pct):
    """Sales tax in cents for an amount, rounded half up to the nearest cent."""
    exact = Decimal(amount_cents) * Decimal(str(rate_pct)) / Decimal(100)
    return int(exact.quantize(Decimal(1), rounding=ROUND_HALF_UP))
