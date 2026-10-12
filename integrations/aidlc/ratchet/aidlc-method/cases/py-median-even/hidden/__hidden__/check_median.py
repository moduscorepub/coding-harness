import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from metrics.median import median  # noqa: E402


class Hidden(unittest.TestCase):
    def test_even_counts_average_the_middle(self):
        self.assertEqual(median([1, 2, 3, 4]), 2.5)
        self.assertEqual(median([4, 1]), 2.5)

    def test_odd_counts_and_single(self):
        self.assertEqual(median([5, 1, 3]), 3)
        self.assertEqual(median([7]), 7)

    def test_input_is_not_reordered(self):
        values = [3, 1, 2]
        median(values)
        self.assertEqual(values, [3, 1, 2])

    def test_empty_is_an_error(self):
        with self.assertRaises(ValueError):
            median([])


if __name__ == "__main__":
    unittest.main()
