import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shop.tax import tax_cents  # noqa: E402


class Hidden(unittest.TestCase):
    def test_halves_round_up(self):
        self.assertEqual(tax_cents(250, 5), 13)
        self.assertEqual(tax_cents(10, 5), 1)
        self.assertEqual(tax_cents(30, 5), 2)

    def test_fractional_rates(self):
        self.assertEqual(tax_cents(1000, 7.5), 75)
        self.assertEqual(tax_cents(333, 7.5), 25)

    def test_below_half_and_zero(self):
        self.assertEqual(tax_cents(1004, 10), 100)
        self.assertEqual(tax_cents(0, 20), 0)


if __name__ == "__main__":
    unittest.main()
