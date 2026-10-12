import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from lists.core import chunk, first  # noqa: E402


class Hidden(unittest.TestCase):
    def test_consecutive_chunks(self):
        self.assertEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
        self.assertEqual(chunk([1, 2, 3], 3), [[1, 2, 3]])
        self.assertEqual(chunk([1, 2], 5), [[1, 2]])

    def test_empty(self):
        self.assertEqual(chunk([], 3), [])

    def test_size_below_one(self):
        for size in (0, -1):
            with self.assertRaises(ValueError):
                chunk([1], size)

    def test_first_still_works(self):
        self.assertEqual(first([9]), 9)


if __name__ == "__main__":
    unittest.main()
