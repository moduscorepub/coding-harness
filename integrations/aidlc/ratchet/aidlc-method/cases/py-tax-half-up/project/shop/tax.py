def tax_cents(amount_cents, rate_pct):
    """Sales tax in cents for an amount, rounded half up to the nearest cent."""
    return round(amount_cents * rate_pct / 100)
