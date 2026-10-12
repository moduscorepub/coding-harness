import unittest

from wordsmith.words import word_count


class WordCount(unittest.TestCase):
    def test_repeated_spaces(self):
        self.assertEqual(word_count("hello   world"), 2)


if __name__ == "__main__":
    unittest.main()
