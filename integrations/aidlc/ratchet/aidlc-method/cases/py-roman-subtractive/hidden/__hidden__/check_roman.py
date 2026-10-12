import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from numerals.roman import to_roman  # noqa: E402


class Hidden(unittest.TestCase):
    def test_subtractive_pairs(self):
        for number, numeral in [(4, "IV"), (9, "IX"), (40, "XL"), (90, "XC"), (400, "CD"), (900, "CM")]:
            self.assertEqual(to_roman(number), numeral)

    def test_composites(self):
        self.assertEqual(to_roman(14), "XIV")
        self.assertEqual(to_roman(1994), "MCMXCIV")
        self.assertEqual(to_roman(3999), "MMMCMXCIX")
        self.assertEqual(to_roman(1), "I")

    def test_out_of_range(self):
        for number in (0, -5, 4000):
            with self.assertRaises(ValueError):
                to_roman(number)


if __name__ == "__main__":
    unittest.main()
