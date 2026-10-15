"""AI 실기 노트북 모의고사 2회 - 준비 코드 (종양 측정값으로 정밀 검사 대상 찾기)

이 파일은 고치지 않습니다. 노트북의 준비 셀이 아래 함수를 불러 씁니다.
데이터는 scikit-learn에 들어 있는 위스콘신 유방 종양(breast cancer) 측정값입니다.
원본의 정답(0 = 악성, 1 = 양성)을 뒤집어 1 = 악성(정밀 검사 대상), 0 = 양성으로 씁니다.
"""
import random

import numpy as np
import pandas as pd
import torch
from torch import nn
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split

_DATA = load_breast_cancer()
FEATURES = [name.replace(" ", "_") for name in _DATA.feature_names]
NEW_SIZE = 100  # 정답 없는 새 검사 결과


def seed_all(seed):
    """파이썬, NumPy, PyTorch의 무작위 상태를 한 번에 고정합니다."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def _full_table():
    df = pd.DataFrame(_DATA.data, columns=FEATURES)
    df["label"] = (1 - _DATA.target).astype(int)
    order = np.random.default_rng(2027).permutation(len(df))
    df = df.iloc[order].reset_index(drop=True)
    df.insert(0, "case_id", [f"C{i:03d}" for i in range(1, len(df) + 1)])
    return df


def load_tables():
    """dev(정답 있음), new_samples(정답 없음 100개), feature_cols(입력 열 30개)"""
    df = _full_table()
    dev = df.iloc[:-NEW_SIZE].reset_index(drop=True)
    new_samples = df.iloc[-NEW_SIZE:].drop(columns="label").reset_index(drop=True)
    return dev, new_samples, list(FEATURES)


def _split():
    dev, _, _ = load_tables()
    return train_test_split(dev, test_size=0.25, random_state=5, stratify=dev["label"])


def ready_train_table():
    """학습용의 원래 측정값 (1번 답안과 같은 분할)"""
    train_df, _ = _split()
    return train_df.copy()


def ready_raw_xy():
    """표준화하지 않은 입력과 정답 (3번 문항용)"""
    train_df, valid_df = _split()
    return {
        "X_train": train_df[FEATURES].to_numpy(dtype=float),
        "X_valid": valid_df[FEATURES].to_numpy(dtype=float),
        "y_train": train_df["label"].to_numpy(dtype=np.int64),
        "y_valid": valid_df["label"].to_numpy(dtype=np.int64),
    }


def ready_data():
    """학습용 평균·표준편차로 표준화한 입력(float32)과 정답(0/1 정수)"""
    raw = ready_raw_xy()
    mean = raw["X_train"].mean(axis=0)
    std = raw["X_train"].std(axis=0)
    return {
        "X_train": ((raw["X_train"] - mean) / std).astype(np.float32),
        "X_valid": ((raw["X_valid"] - mean) / std).astype(np.float32),
        "y_train": raw["y_train"],
        "y_valid": raw["y_valid"],
    }


def load_classification_example():
    """어떤 분류기의 결과 40개: actual(실제), guessed(예측). 1 = 정밀 검사 대상"""
    rng = np.random.default_rng(41)
    actual = np.array([1] * 15 + [0] * 25, dtype=np.int64)
    rng.shuffle(actual)
    guessed = actual.copy()
    for pos in rng.choice(len(actual), size=7, replace=False):
        guessed[pos] = 1 - actual[pos]
    return actual, guessed


def make_practice_model():
    """6번 문항에서 학습할 신경망 (입력 30 → 은닉 12 → 점수 1)"""
    torch.manual_seed(202)
    return nn.Sequential(nn.Linear(30, 12), nn.ReLU(), nn.Linear(12, 1))


def make_dropout_model():
    """7번 문항의 Dropout이 있는 신경망 (학습하지 않은 상태)"""
    torch.manual_seed(303)
    return nn.Sequential(nn.Linear(30, 16), nn.ReLU(), nn.Dropout(0.5), nn.Linear(16, 1))


def load_valid_probs():
    """기준 모델이 검증용에 낸 '정밀 검사 대상일 확률'과 실제 정답"""
    _, valid_df = _split()
    actual = valid_df["label"].to_numpy(dtype=np.int64)
    rng = np.random.default_rng(77)
    probs = np.where(actual == 1, rng.beta(5, 2, len(actual)), rng.beta(2, 5, len(actual)))
    return actual, np.round(probs, 4)
