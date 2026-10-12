import unittest

from lists.core import first


class First(unittest.TestCase):
    def test_first(self):
        self.assertEqual(first([3, 4]), 3)
        self.assertEqual(first([], "none"), "none")


if __name__ == "__main__":
    unittest.main()
