import unittest

from shop.tax import tax_cents


class TaxCents(unittest.TestCase):
    def test_half_rounds_up(self):
        self.assertEqual(tax_cents(250, 5), 13)


if __name__ == "__main__":
    unittest.main()
