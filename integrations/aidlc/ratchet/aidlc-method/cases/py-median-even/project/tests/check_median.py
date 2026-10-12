import unittest

from metrics.median import median


class Median(unittest.TestCase):
    def test_even_count(self):
        self.assertEqual(median([1, 2, 3, 4]), 2.5)


if __name__ == "__main__":
    unittest.main()
