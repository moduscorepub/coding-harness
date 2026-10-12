import unittest

from numerals.roman import to_roman


class ToRoman(unittest.TestCase):
    def test_subtractive(self):
        self.assertEqual(to_roman(4), "IV")


if __name__ == "__main__":
    unittest.main()
