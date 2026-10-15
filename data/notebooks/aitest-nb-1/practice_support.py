"""AI 실기 노트북 모의고사 1회 - 준비 코드 (붓꽃 품종 분류)

이 파일은 고치지 않습니다. 노트북의 준비 셀이 아래 함수를 불러 씁니다.
데이터는 scikit-learn에 들어 있는 붓꽃(iris) 측정값입니다.
"""
import random

import numpy as np
import pandas as pd
import torch
from torch import nn
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split

FEATURES = ["sepal_length", "sepal_width", "petal_length", "petal_width"]
DEV_SIZE = 120  # 나머지 30개는 정답 없는 새 꽃


def seed_all(seed):
    """파이썬, NumPy, PyTorch의 무작위 상태를 한 번에 고정합니다."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def _full_table():
    data = load_iris()
    df = pd.DataFrame(data.data, columns=FEATURES)
    df["label"] = data.target.astype(int)
    order = np.random.default_rng(2026).permutation(len(df))
    df = df.iloc[order].reset_index(drop=True)
    df.insert(0, "flower_id", [f"F{i:03d}" for i in range(1, len(df) + 1)])
    return df


def load_tables():
    """dev(정답 있음 120개), new_samples(정답 없음 30개), feature_cols(입력 열 4개)"""
    df = _full_table()
    dev = df.iloc[:DEV_SIZE].reset_index(drop=True)
    new_samples = df.iloc[DEV_SIZE:].drop(columns="label").reset_index(drop=True)
    return dev, new_samples, list(FEATURES)


def _split():
    dev, _, _ = load_tables()
    return train_test_split(dev, test_size=0.2, random_state=7, stratify=dev["label"])


def ready_train_table():
    """학습용 96개의 원래 측정값 (1번 답안과 같은 분할)"""
    train_df, _ = _split()
    return train_df.copy()


def ready_data():
    """학습용 평균·표준편차로 표준화한 입력과 정답"""
    train_df, valid_df = _split()
    mean = train_df[FEATURES].mean()
    std = train_df[FEATURES].std(ddof=0)
    to_x = lambda df: ((df[FEATURES] - mean) / std).to_numpy(dtype=np.float32)
    return {
        "X_train": to_x(train_df),
        "X_valid": to_x(valid_df),
        "y_train": train_df["label"].to_numpy(dtype=np.int64),
        "y_valid": valid_df["label"].to_numpy(dtype=np.int64),
    }


def load_classification_example():
    """어떤 분류기의 결과 30개: actual(실제 품종), guessed(예측 품종)"""
    rng = np.random.default_rng(31)
    actual = np.array([0, 1, 2] * 10, dtype=np.int64)
    rng.shuffle(actual)
    guessed = actual.copy()
    for pos in rng.choice(len(actual), size=6, replace=False):
        guessed[pos] = (actual[pos] + rng.integers(1, 3)) % 3
    return actual, guessed


def make_practice_model():
    """6번 문항에서 학습할 작은 신경망 (입력 4 → 은닉 8 → 점수 3)"""
    torch.manual_seed(101)
    return nn.Sequential(nn.Linear(4, 8), nn.ReLU(), nn.Linear(8, 3))


def load_reference_scores():
    """새 꽃 30개에 대해 기준 모델이 낸 점수: ids(꽃 번호), scores(30, 3)"""
    _, new_samples, _ = load_tables()
    rng = np.random.default_rng(58)
    scores = (rng.normal(size=(len(new_samples), 3)) * 1.6).astype(np.float32)
    return new_samples["flower_id"].to_numpy(), scores
