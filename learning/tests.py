from django.test import TestCase

from learning.services import calculate_stars


class CalculateStarsTests(TestCase):
    """Star thresholds: 0 wrong -> 3, 1-2 wrong -> 2, 3+ wrong -> 1."""

    def test_no_wrong_answers_is_three_stars(self):
        self.assertEqual(calculate_stars(0, 10), 3)

    def test_up_to_two_wrong_is_two_stars(self):
        self.assertEqual(calculate_stars(1, 10), 2)
        self.assertEqual(calculate_stars(2, 10), 2)

    def test_more_than_two_wrong_is_one_star(self):
        self.assertEqual(calculate_stars(3, 10), 1)
        self.assertEqual(calculate_stars(9, 10), 1)
