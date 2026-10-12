import unittest

from units.temperature import to_celsius


class ToCelsius(unittest.TestCase):
    def test_boiling(self):
        self.assertEqual(to_celsius(212), 100.0)


if __name__ == "__main__":
    unittest.main()
