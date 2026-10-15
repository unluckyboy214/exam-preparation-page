"""AI 실기 노트북 모의고사 3회 - 준비 코드 (1년 뒤 진행 지표 예측하기)

이 파일은 고치지 않습니다. 노트북의 준비 셀이 아래 함수를 불러 씁니다.
데이터는 scikit-learn에 들어 있는 당뇨병(diabetes) 자료의 원래 값(scaled=False)입니다.
scikit-learn 1.1 이상이 필요합니다.
"""
import random

import numpy as np
import pandas as pd
import torch
from torch import nn
from sklearn.datasets import load_diabetes
from sklearn.model_selection import train_test_split

_DATA = load_diabetes(scaled=False)
FEATURES = list(_DATA.feature_names)  # age, sex, bmi, bp, s1 ~ s6
NEW_SIZE = 80
TARGET_SCALE = 100.0  # 신경망 문항에서는 target을 100으로 나눈 값을 정답으로 쓴다


def seed_all(seed):
    """파이썬, NumPy, PyTorch의 무작위 상태를 한 번에 고정합니다."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def _full_table():
    df = pd.DataFrame(_DATA.data, columns=FEATURES)
    df["target"] = _DATA.target.astype(float)
    order = np.random.default_rng(2028).permutation(len(df))
    df = df.iloc[order].reset_index(drop=True)
    df.insert(0, "patient_id", [f"P{i:03d}" for i in range(1, len(df) + 1)])
    return df


def load_tables():
    """dev(정답 있음), new_samples(정답 없음 80명), feature_cols(입력 열 10개)"""
    df = _full_table()
    dev = df.iloc[:-NEW_SIZE].reset_index(drop=True)
    new_samples = df.iloc[-NEW_SIZE:].drop(columns="target").reset_index(drop=True)
    return dev, new_samples, list(FEATURES)


def _split():
    dev, _, _ = load_tables()
    return train_test_split(dev, test_size=0.2, random_state=3)


def ready_train_table():
    """학습용의 원래 값 (1번 답안과 같은 분할)"""
    train_df, _ = _split()
    return train_df.copy()


def ready_raw_xy():
    """표준화하지 않은 입력과 원래 단위의 정답 (3번 문항용)"""
    train_df, valid_df = _split()
    return {
        "X_train": train_df[FEATURES].to_numpy(dtype=float),
        "X_valid": valid_df[FEATURES].to_numpy(dtype=float),
        "y_train": train_df["target"].to_numpy(dtype=float),
        "y_valid": valid_df["target"].to_numpy(dtype=float),
    }


def ready_data():
    """표준화한 입력(float32)과 100으로 나눈 정답(float32, 1차원)"""
    raw = ready_raw_xy()
    mean = raw["X_train"].mean(axis=0)
    std = raw["X_train"].std(axis=0)
    return {
        "X_train": ((raw["X_train"] - mean) / std).astype(np.float32),
        "X_valid": ((raw["X_valid"] - mean) / std).astype(np.float32),
        "y_train": (raw["y_train"] / TARGET_SCALE).astype(np.float32),
        "y_valid": (raw["y_valid"] / TARGET_SCALE).astype(np.float32),
    }


def load_regression_example():
    """어떤 회귀 모델의 결과 40개: actual(실제 값), guessed(예측 값). 원래 단위"""
    rng = np.random.default_rng(43)
    actual = np.round(rng.uniform(40, 320, 40), 1)
    guessed = np.round(actual + rng.normal(0, 45, 40), 1)
    return actual, guessed


def make_practice_model():
    """6번 문항에서 학습할 신경망 (입력 10 → 은닉 16 → 예측 1)"""
    torch.manual_seed(404)
    return nn.Sequential(nn.Linear(10, 16), nn.ReLU(), nn.Linear(16, 1))


def load_valid_predictions():
    """기준 모델의 검증용 결과: ids(환자 번호), actual(실제), pred(예측). 원래 단위"""
    _, valid_df = _split()
    actual = valid_df["target"].to_numpy(dtype=float)
    rng = np.random.default_rng(88)
    pred = np.round(actual + rng.normal(0, 50, len(actual)), 1)
    return valid_df["patient_id"].to_numpy(), actual, pred
