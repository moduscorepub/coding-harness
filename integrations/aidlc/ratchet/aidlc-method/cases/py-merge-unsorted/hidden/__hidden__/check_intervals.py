import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from slots.intervals import merge  # noqa: E402


class Hidden(unittest.TestCase):
    def test_unsorted_overlaps(self):
        self.assertEqual(merge([[5, 7], [1, 3], [2, 6]]), [[1, 7]])

    def test_touching_and_disjoint(self):
        self.assertEqual(merge([[2, 3], [1, 2]]), [[1, 3]])
        self.assertEqual(merge([[4, 5], [1, 2]]), [[1, 2], [4, 5]])

    def test_empty(self):
        self.assertEqual(merge([]), [])

    def test_caller_list_unchanged(self):
        given = [[3, 4], [1, 5]]
        merge(given)
        self.assertEqual(given, [[3, 4], [1, 5]])


if __name__ == "__main__":
    unittest.main()
