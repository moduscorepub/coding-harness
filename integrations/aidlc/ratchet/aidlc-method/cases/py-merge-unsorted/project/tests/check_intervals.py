import unittest

from slots.intervals import merge


class Merge(unittest.TestCase):
    def test_unsorted_overlaps(self):
        self.assertEqual(merge([[5, 7], [1, 3], [2, 6]]), [[1, 7]])


if __name__ == "__main__":
    unittest.main()
