import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wordsmith.words import word_count  # noqa: E402


class Hidden(unittest.TestCase):
    def test_whitespace_runs(self):
        self.assertEqual(word_count("hello   world"), 2)
        self.assertEqual(word_count("  a\tb\nc  "), 3)

    def test_empty_and_single(self):
        self.assertEqual(word_count(""), 0)
        self.assertEqual(word_count("   "), 0)
        self.assertEqual(word_count("one"), 1)


if __name__ == "__main__":
    unittest.main()
