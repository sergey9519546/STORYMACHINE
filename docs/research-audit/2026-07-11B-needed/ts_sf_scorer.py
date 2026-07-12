"""Transportation Scale Short Form (TS-SF) Scorer and Quality Gate.

TS-SF: 6-item short form (1-7 scale), target mean >= 5.0 for high transportation.
"""

from dataclasses import dataclass
from typing import List, Optional


TS_SF_ITEMS = [
    "I could picture the events in this story taking place.",
    "I was mentally involved in the story while reading it.",
    "I wanted to learn how the story ended.",
    "The story affected me emotionally.",
    "I was very interested in what happens to the characters.",
    "After finishing the story, I wanted to discuss it with someone.",
]

TS_SF_MIN_ITEMS = 6
TS_SF_MIN_SCORE = 1
TS_SF_MAX_SCORE = 7
TS_SF_TARGET_MEAN = 5.0


@dataclass
class TSSFResult:
    """Result of TS-SF scoring."""
    scores: List[int]
    mean: float
    passed: bool
    
    def __str__(self) -> str:
        status = "PASS" if self.passed else "FAIL"
        return f"TS-SF: mean={self.mean:.2f}, items={self.scores}, {status}"


class TSSFScorer:
    """Scores Transportation Scale Short Form responses."""
    
    def __init__(self, target_mean: float = TS_SF_TARGET_MEAN):
        self.target_mean = target_mean
    
    def validate_scores(self, scores: List[int]) -> Optional[str]:
        """Validate scores list. Returns error message or None if valid."""
        if len(scores) != TS_SF_MIN_ITEMS:
            return f"Expected {TS_SF_MIN_ITEMS} items, got {len(scores)}"
        for i, s in enumerate(scores):
            if not isinstance(s, int):
                return f"Item {i+1}: expected int, got {type(s).__name__}"
            if s < TS_SF_MIN_SCORE or s > TS_SF_MAX_SCORE:
                return f"Item {i+1}: score {s} out of range [{TS_SF_MIN_SCORE}, {TS_SF_MAX_SCORE}]"
        return None
    
    def score(self, scores: List[int]) -> TSSFResult:
        """Score a TS-SF response list."""
        error = self.validate_scores(scores)
        if error:
            raise ValueError(f"Invalid scores: {error}")
        mean = sum(scores) / len(scores)
        passed = mean >= self.target_mean
        return TSSFResult(scores=scores, mean=mean, passed=passed)
    
    def score_many(self, responses: List[List[int]]) -> List[TSSFResult]:
        """Score multiple TS-SF response lists."""
        return [self.score(r) for r in responses]


class TS_SF_Gate:
    """Automated quality gate for TS-SF verification."""
    
    def __init__(self, target_mean: float = TS_SF_TARGET_MEAN, min_pass_rate: float = 0.8):
        self.target_mean = target_mean
        self.min_pass_rate = min_pass_rate
        self.scorer = TSSFScorer(target_mean=target_mean)
    
    def verify(self, scores: List[int]) -> bool:
        """Verify a single TS-SF response meets quality gate."""
        result = self.scorer.score(scores)
        return result.passed
    
    def verify_batch(self, responses: List[List[int]]) -> dict:
        """Verify batch and return summary statistics."""
        results = self.scorer.score_many(responses)
        passed = sum(1 for r in results if r.passed)
        total = len(results)
        pass_rate = passed / total if total > 0 else 0.0
        
        means = [r.mean for r in results]
        summary = {
            "total": total,
            "passed": passed,
            "pass_rate": pass_rate,
            "mean_mean": sum(means) / len(means) if means else 0.0,
            "min_mean": min(means) if means else 0.0,
            "max_mean": max(means) if means else 0.0,
            "gate_met": pass_rate >= self.min_pass_rate,
        }
        return summary
    
    def verify_or_raise(self, scores: List[int]) -> TSSFResult:
        """Verify or raise exception if gate not met."""
        result = self.scorer.score(scores)
        if not result.passed:
            raise ValueError(f"TS-SF gate failed: mean={result.mean:.2f} < {self.target_mean}")
        return result


def calculate_ts_sf_mean(scores: List[int]) -> float:
    """Helper function to calculate TS-SF mean score."""
    if len(scores) != TS_SF_MIN_ITEMS:
        raise ValueError(f"Expected {TS_SF_MIN_ITEMS} scores")
    return sum(scores) / TS_SF_MIN_ITEMS


def is_high_transportation(scores: List[int], target: float = TS_SF_TARGET_MEAN) -> bool:
    """Helper to check if scores indicate high transportation."""
    return calculate_ts_sf_mean(scores) >= target


if __name__ == "__main__":
    # Example usage
    example_scores = [6, 5, 6, 5, 6, 5]
    result = TSSFScorer().score(example_scores)
    print(result)
    
    gate = TS_SF_Gate()
    verified = gate.verify(example_scores)
    print(f"Gate verification: {verified}")