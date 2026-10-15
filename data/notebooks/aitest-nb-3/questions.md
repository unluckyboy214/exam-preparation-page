# AI 실기 노트북 모의고사 3회

> 답안과 실행 결과는 `student.ipynb`에 작성합니다. 이 문서는 문제지입니다.

한 병원이 환자의 나이, 체질량지수(BMI), 혈압, 혈액 검사 수치 6개를 기록했습니다. 이 값으로 **1년 뒤의 질병 진행 지표**(숫자)를 예측하려고 합니다. 의학 지식은 필요하지 않습니다.

이 모의고사는 범주가 아니라 **수치를 예측하는 회귀**를 다룹니다. 신경망은 환자마다 예측값 **하나**를 출력합니다. 맞았는지가 아니라 **얼마나 차이 나는지(오차)** 로 평가합니다.

**총 8문항, 100점, 시험 120분**

- 공통 준비 셀을 먼저 실행하고, 각 문항 안의 셀은 위에서 아래로 실행하세요. 문항마다 필요한 자료를 따로 주므로 다른 문항의 답안은 필요하지 않습니다. 같은 문항의 (b), (c)는 앞 소문항의 결과를 써도 됩니다.
- `실행만 하세요` 셀은 고치지 않습니다. `작성하세요` 셀의 `None`이나 빈 곳을 코드로 바꾸세요. 중간 변수를 더하거나 여러 줄로 써도 됩니다. 정해진 변수 이름과 함수의 입력·반환 형식은 지키세요.
- 특정 정확도에 도달해야 하는 것은 아닙니다. 요구한 처리, 학습, 평가 과정을 수행하세요.
- 각 문항의 `확인` 셀을 실행하면 소문항별로 통과 여부와 점수를 보여 줍니다. 마지막 셀에서 총점을 확인하세요.
- 인터넷과 생성형 AI는 쓰지 않습니다. 필요한 데이터는 scikit-learn에 들어 있습니다.

## 데이터 안내

scikit-learn에 들어 있는 당뇨병(diabetes) 자료 442명의 **원래 값**을 섞어서 씁니다.

| 제공 자료 | 의미 |
|---|---|
| `dev` | 정답이 있는 개발용 데이터 362명. 1번에서 학습용과 검증용으로 나눕니다. |
| `new_samples` | 정답이 없는 새 환자 80명. |
| `patient_id` | 환자 번호(`P001` 형태). 모델 입력으로 쓰지 않습니다. |
| `target` | 예측할 1년 뒤 진행 지표. 대략 25 ~ 346 사이의 실수입니다. |
| `feature_cols` | 입력으로 쓸 열 10개: `age`, `sex`, `bmi`, `bp`, `s1` ~ `s6` |

`sex`는 1, 2로 기록된 범주이고, `s1` ~ `s6`은 혈액 검사 수치입니다. 결측치는 없습니다.

신경망 문항(5 ~ 7번)에서는 표준화한 입력과 **100으로 나눈 target**을 정답으로 씁니다. 숫자가 너무 크면 학습이 느려지기 때문입니다.

## 문항 구성

| 문항 | 내용 | 배점 |
|---|---|---|
| 1 | 정답 분포 확인하고 데이터 나누기 | 12점 |
| 2 | 정답과 관계가 큰 입력 찾기 | 10점 |
| 3 | 선형 회귀와 평균 예측 비교하기 | 12점 |
| 4 | 회귀 오차 지표 계산하기 | 14점 |
| 5 | 수치 하나를 예측하는 신경망 만들기 | 16점 |
| 6 | 학습 반복문 전체를 직접 쓰기 | 18점 |
| 7 | Dropout을 넣고 원래 단위로 예측하기 | 10점 |
| 8 | 오차가 큰 환자 찾기 | 8점 |

## 1. 정답 분포 확인하고 데이터 나누기 | 12점

`dev`의 정답 열은 `target`입니다. 정답 값의 범위를 확인하고 80%를 학습용, 20%를 검증용으로 나눕니다.

회귀에서는 정답이 연속된 수치라서 `stratify`를 쓰지 않습니다.

**(a) [4점]** `dev['target']`의 평균, 표준편차, 최솟값, 최댓값을 구해 `target_stats`에 저장하세요. 인덱스가 `mean`, `std`, `min`, `max` 순서인 pandas Series입니다.

**(b) [5점]** `train_test_split`으로 `dev`를 나누어 `train_df`, `valid_df`에 저장하세요. `test_size=0.2`, `random_state=3`을 쓰고 `stratify`는 쓰지 않습니다.

**(c) [3점]** `train_df`의 `feature_cols` 열을 NumPy 배열 `X_tr`로, `target` 열을 NumPy 배열 `y_tr`로 만드세요.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
print('dev:', dev.shape)
```

답안 작성

```python
# 작성하세요
# (a) 정답의 요약 통계
target_stats = None

# (b) 학습용과 검증용 나누기
train_df = None
valid_df = None

# (c) 입력 배열과 정답 배열
X_tr = None
y_tr = None
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 2. 정답과 관계가 큰 입력 찾기 | 10점

`stats_df`는 따로 주는 **학습용의 원래 값**입니다. 1번 답안이 없어도 씁니다. 어떤 입력이 `target`과 함께 커지거나 작아지는지 상관계수로 확인합니다. 상관계수는 -1 ~ 1이고 1에 가까울수록 함께 커집니다.

**(a) [5점]** 입력 열 10개(`feature_cols`) 각각과 `target`의 상관계수를 구해 **큰 순서로** 정렬한 Series를 `corr_target`에 저장하세요. 인덱스는 입력 열 이름이고, `target` 자신은 넣지 않습니다.

**(b) [5점]** 주어진 `ax`에 가로축 `bmi`, 세로축 `target`인 산점도를 그리세요.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
stats_df = ready_train_table()
print('학습용 환자 수:', len(stats_df))
```

답안 작성

```python
# 작성하세요
# (a) 입력별 상관계수 (큰 순서)
corr_target = None

# (b) 산점도
fig, ax = plt.subplots(figsize=(5, 3.5))
# 이곳에 산점도를 그리는 코드를 작성하세요.

ax.set_xlabel('BMI')
ax.set_ylabel('Progress after 1 year')
plt.show()
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 3. 선형 회귀와 평균 예측 비교하기 | 12점

모델이 쓸모 있는지 보려면 **아무것도 배우지 않은 기준**과 비교합니다. 여기서는 모든 환자를 학습용 평균으로 예측하는 것을 기준으로 삼습니다.

준비 셀이 표준화하지 않은 `X_train`, `X_valid`와 원래 단위의 정답 `y_train`, `y_valid`를 만듭니다. 1, 2번 답안은 필요하지 않습니다.

**(a) [6점]** `LinearRegression`으로 `lin`을 만들어 `X_train`, `y_train`으로 학습하고, `X_valid`의 예측을 `pred_lin`에 저장하세요.

**(b) [3점]** 검증용 환자 수만큼 **학습용 `y_train`의 평균**으로 채운 배열을 `pred_base`에 저장하세요.

**(c) [3점]** 두 예측의 MAE를 구해 `mae_lin`, `mae_base`에 저장하세요.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
raw = ready_raw_xy()
X_train, X_valid = raw['X_train'], raw['X_valid']
y_train, y_valid = raw['y_train'], raw['y_valid']
print('학습 입력:', X_train.shape, '/ 검증 입력:', X_valid.shape)
```

답안 작성

```python
# 작성하세요
# (a) 선형 회귀
lin = None
pred_lin = None

# (b) 평균으로만 예측
pred_base = None

# (c) 두 예측의 MAE
mae_lin = None
mae_base = None
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 4. 회귀 오차 지표 계산하기 | 14점

어떤 회귀 모델의 결과 40개를 줍니다. `actual`은 실제 값, `guessed`는 예측값이며 원래 단위입니다. 3번 답안은 쓰지 않습니다.

**(a) [4점]** 평균 절대 오차(MAE)를 `mae`에 저장하세요.

**(b) [5점]** 평균 제곱근 오차(RMSE)를 `rmse`에 저장하세요. MSE의 제곱근입니다.

**(c) [5점]** 결정 계수(R²)를 `r2`에 저장하세요.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
actual, guessed = load_regression_example()
print('결과 수:', len(actual))
print('앞의 3개 실제 / 예측:', actual[:3], guessed[:3])
```

답안 작성

```python
# 작성하세요
# (a) MAE
mae = None

# (b) RMSE
rmse = None

# (c) R²
r2 = None
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 5. 수치 하나를 예측하는 신경망 만들기 | 16점

입력 10개를 받아 **예측값 하나**를 내는 신경망을 만듭니다. 구조는 `입력 10 → Linear(출력 32) → ReLU → Linear(출력 16) → ReLU → Linear(출력 1)`입니다. 회귀이므로 마지막에 활성화 함수를 넣지 않습니다.

준비 셀의 `yb`는 100으로 나눈 정답이며 모양이 `(B,)`입니다. 모델 출력 `(B, 1)`과 모양을 맞춰야 손실이 바르게 계산됩니다.

**(a) [7점]** `nn.Sequential`로 위 구조의 신경망을 만들어 `net`에 저장하세요.

**(b) [3점]** 평균 제곱 오차 손실 함수 `nn.MSELoss`를 만들어 `loss_fn`에 저장하세요.

**(c) [3점]** `net`의 모든 가중치를 갱신하는 `torch.optim.Adam`을 `optimizer`에 만드세요. 학습률은 0.01입니다.

**(d) [3점]** `yb`의 모양을 `(B, 1)`로 바꿔 `yb_col`에 저장하세요.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
seed_all(3)
d = ready_data()
xb = torch.tensor(d['X_train'][:8], dtype=torch.float32)
yb = torch.tensor(d['y_train'][:8], dtype=torch.float32)
print('입력 크기:', tuple(xb.shape), '/ 정답 크기:', tuple(yb.shape))
```

답안 작성

```python
# 작성하세요
# (a) 회귀 신경망
net = None

# (b) 손실 함수
loss_fn = None

# (c) 가중치 갱신 방법
optimizer = None

# (d) 정답 모양 맞추기
yb_col = None

# 아래는 확인용입니다. 고치지 마세요.
if net is not None and loss_fn is not None and yb_col is not None:
    print('출력 크기:', tuple(net(xb).shape), '/ 학습 전 손실:', float(loss_fn(net(xb), yb_col)))
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 6. 학습 반복문 전체를 직접 쓰기 | 18점

이번에는 학습 함수 없이 **반복문 전체**를 직접 씁니다. 준비 셀이 신경망 `train_net`(입력 10 → 은닉 16 → 예측 1), `loader`(최대 32개씩, 정답 모양 `(B, 1)`), 검증 데이터 `xv`, `yv`, 손실 함수 `train_loss_fn`, 옵티마이저 `train_opt`를 줍니다.

다시 학습하려면 **이 문항의 준비 셀부터** 다시 실행하세요. 학습 결과는 모범 답안과 같은지 비교하므로 아래 순서를 지키세요.

**(a) [12점]** 1부터 100까지 100 epoch를 학습하세요. 매 epoch마다 아래를 차례로 합니다.

1. `train_net`을 학습 모드로 바꾸고, `loader`의 배치마다 기울기 초기화 → 예측 → 손실 → 기울기 계산 → 가중치 갱신을 합니다.
2. 학습 손실 `tr_loss`는 **배치 손실 × 배치 크기를 모두 더해 전체 학습 데이터 수로 나눈 값**입니다.
3. 그다음 평가 모드로 바꾸고 기울기를 기록하지 않는 범위에서 `xv`, `yv`의 손실을 구해 `va_loss`(실수)에 저장합니다.
4. `epoch`, `train_loss`, `valid_loss` 세 키를 가진 딕셔너리를 `history`에 추가합니다.

**(b) [6점]** `history`를 DataFrame `history_df`로 만들고, 검증 손실이 가장 작은 epoch 번호(정수)를 `best_epoch`에 저장하세요.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
seed_all(3)
d = ready_data()
train_set = TensorDataset(torch.tensor(d['X_train'], dtype=torch.float32),
                          torch.tensor(d['y_train'], dtype=torch.float32).view(-1, 1))
loader = DataLoader(train_set, batch_size=32, shuffle=True,
                    generator=torch.Generator().manual_seed(3))
xv = torch.tensor(d['X_valid'], dtype=torch.float32)
yv = torch.tensor(d['y_valid'], dtype=torch.float32).view(-1, 1)
train_net = make_practice_model()
train_loss_fn = nn.MSELoss()
train_opt = torch.optim.Adam(train_net.parameters(), lr=0.01)
print('학습 배치 수:', len(loader))
```

답안 작성

```python
# 작성하세요
# (a) 학습 반복문
history = []
# 이곳에 반복문 전체를 작성하세요.

# (b) 기록 표와 가장 좋은 epoch
history_df = None
best_epoch = None
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 7. Dropout을 넣고 원래 단위로 예측하기 | 10점

새 모델은 `입력 10 → Linear(출력 32) → ReLU → Dropout → Linear(출력 1)`입니다. 이 모델은 100으로 나눈 값을 예측하도록 만들어졌으므로, 사람이 볼 때는 **100을 곱해 원래 단위**로 돌립니다. 이 문항에서는 학습하지 않습니다.

`sample_x`는 `(5, 10)` 텐서입니다.

**(a) [6점]** `nn.Sequential`로 위 구조의 모델을 만들어 `drop_net`에 저장하세요. `nn.Dropout`의 `p`는 0.1이고 ReLU 바로 뒤에 둡니다.

**(b) [4점]** `predict_values(model, x)`를 완성하세요. 평가 모드로 바꾸고 기울기를 기록하지 않는 범위에서 예측한 뒤, 100을 곱해 모양 `(샘플 수,)`인 **NumPy 배열**을 `out`에 저장합니다.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
seed_all(17)
sample_x = torch.tensor(ready_data()['X_valid'][:5], dtype=torch.float32)
```

답안 작성

```python
# 작성하세요
# (a) Dropout이 있는 회귀 신경망
drop_net = None

# (b) 원래 단위로 예측하는 함수
def predict_values(model, x):
    out = None
    # 이곳에 평가 모드 설정과 예측 코드를 작성하세요.
    return out

if drop_net is not None:
    print('예측값:', predict_values(drop_net, sample_x))
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 8. 오차가 큰 환자 찾기 | 8점

기준 모델이 검증용 환자에 대해 낸 예측 `pred`와 실제 값 `actual`, 같은 순서의 환자 번호 `ids`(NumPy 배열)를 줍니다. 모두 원래 단위입니다. 오차가 큰 환자를 골라 기록을 다시 확인하려고 합니다.

**(a) [4점]** 환자마다 `|실제 - 예측|`을 구해 NumPy 배열 `abs_err`에 저장하세요.

**(b) [4점]** `abs_err`가 큰 순서대로 5명의 환자 번호를 `top5_ids`에 저장하세요. 길이 5의 NumPy 배열이며 첫 번째가 오차가 가장 큰 환자입니다.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
ids, actual, pred = load_valid_predictions()
print('검증용 환자 수:', len(ids))
```

답안 작성

```python
# 작성하세요
# (a) 환자별 절대 오차
abs_err = None

# (b) 오차가 큰 5명
top5_ids = None
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.
