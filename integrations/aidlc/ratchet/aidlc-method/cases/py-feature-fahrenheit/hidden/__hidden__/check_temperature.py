import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from units.temperature import to_celsius, to_fahrenheit  # noqa: E402


class Hidden(unittest.TestCase):
    def test_known_points(self):
        self.assertEqual(to_fahrenheit(100), 212.0)
        self.assertEqual(to_fahrenheit(-40), -40.0)
        self.assertEqual(to_fahrenheit(0), 32.0)

    def test_rounds_to_one_decimal(self):
        self.assertEqual(to_fahrenheit(36.6), 97.9)

    def test_absolute_zero_is_the_floor(self):
        self.assertEqual(to_fahrenheit(-273.15), -459.7)
        with self.assertRaises(ValueError):
            to_fahrenheit(-300)

    def test_to_celsius_still_works(self):
        self.assertEqual(to_celsius(32), 0.0)


if __name__ == "__main__":
    unittest.main()
