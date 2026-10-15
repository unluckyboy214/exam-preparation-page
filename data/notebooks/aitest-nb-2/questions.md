# AI 실기 노트북 모의고사 2회

> 답안과 실행 결과는 `student.ipynb`에 작성합니다. 이 문서는 문제지입니다.

검사실이 종양 세포 영상에서 크기, 질감, 모양 등 30가지 수치를 측정했습니다. 이 수치로 **정밀 검사가 필요한 종양(1)** 과 그렇지 않은 종양(0)을 구분하려고 합니다. 의학 지식은 필요하지 않습니다.

이 모의고사는 둘 중 하나를 고르는 **이진 분류**를 다룹니다. 신경망은 종양마다 **점수 하나**를 출력하고, sigmoid로 바꾸면 1일 확률이 됩니다.

**총 8문항, 100점, 시험 120분**

- 공통 준비 셀을 먼저 실행하고, 각 문항 안의 셀은 위에서 아래로 실행하세요. 문항마다 필요한 자료를 따로 주므로 다른 문항의 답안은 필요하지 않습니다. 같은 문항의 (b), (c)는 앞 소문항의 결과를 써도 됩니다.
- `실행만 하세요` 셀은 고치지 않습니다. `작성하세요` 셀의 `None`이나 빈 곳을 코드로 바꾸세요. 중간 변수를 더하거나 여러 줄로 써도 됩니다. 정해진 변수 이름과 함수의 입력·반환 형식은 지키세요.
- 특정 정확도에 도달해야 하는 것은 아닙니다. 요구한 처리, 학습, 평가 과정을 수행하세요.
- 각 문항의 `확인` 셀을 실행하면 소문항별로 통과 여부와 점수를 보여 줍니다. 마지막 셀에서 총점을 확인하세요.
- 인터넷과 생성형 AI는 쓰지 않습니다. 필요한 데이터는 scikit-learn에 들어 있습니다.

## 데이터 안내

scikit-learn에 들어 있는 위스콘신 유방 종양 측정값 569개를 섞어서 씁니다. 원본의 정답을 뒤집어 **1 = 정밀 검사 대상(악성)**, 0 = 양성으로 바꾸었습니다.

| 제공 자료 | 의미 |
|---|---|
| `dev` | 정답이 있는 개발용 데이터 469개. 1번에서 학습용과 검증용으로 나눕니다. |
| `new_samples` | 정답이 없는 새 검사 결과 100개. |
| `case_id` | 검사 번호(`C001` 형태). 모델 입력으로 쓰지 않습니다. |
| `label` | 예측할 정답. 1 = 정밀 검사 대상, 0 = 아님. |
| `feature_cols` | 입력으로 쓸 측정값 열 30개의 이름 목록입니다. |

열 이름은 `mean_radius`(평균 반지름), `mean_texture`(평균 질감)처럼 `<통계>_<측정 항목>` 형태입니다. 각 열의 뜻을 외울 필요는 없습니다. 결측치는 없습니다. 열마다 값의 범위가 크게 달라서(0.01 단위부터 수천까지) **표준화가 중요**합니다.

## 문항 구성

| 문항 | 내용 | 배점 |
|---|---|---|
| 1 | 정답 비율을 지키며 나누고 입력 배열 만들기 | 12점 |
| 2 | 정답별 측정값 분포 비교하기 | 10점 |
| 3 | 표준화한 뒤 로지스틱 회귀로 분류하기 | 12점 |
| 4 | 정밀도와 재현율 구하기 | 14점 |
| 5 | 점수 하나를 내는 이진 분류 신경망 만들기 | 16점 |
| 6 | 반복 학습하고 손실 그래프 그리기 | 18점 |
| 7 | 평가 모드로 확률 구하고 0/1로 바꾸기 | 10점 |
| 8 | 놓치지 않는 기준값 고르기 | 8점 |

## 1. 정답 비율을 지키며 나누고 입력 배열 만들기 | 12점

`dev`의 정답 열은 `label`입니다. 정밀 검사 대상이 얼마나 되는지 확인하고, 75%를 학습용, 25%를 검증용으로 나눕니다. 두 데이터에 1과 0이 **비슷한 비율로** 들어가게 하세요.

**(a) [3점]** `dev`에서 `label`이 1인 비율(0~1 실수)을 `pos_rate`에 저장하세요.

**(b) [6점]** `train_test_split`으로 `dev`를 나누어 `train_df`, `valid_df`에 저장하세요. `test_size=0.25`, `random_state=5`, `stratify`에는 정답을 넘깁니다. 모든 열과 원래 행 인덱스를 그대로 둡니다.

**(c) [3점]** `train_df`에서 `feature_cols`의 열만 골라 NumPy 배열 `X_tr`로, `label` 열을 NumPy 배열 `y_tr`로 만드세요.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
print('dev:', dev.shape)
```

답안 작성

```python
# 작성하세요
# (a) 정밀 검사 대상의 비율
pos_rate = None

# (b) 학습용과 검증용 나누기
train_df = None
valid_df = None

# (c) 입력 배열과 정답 배열
X_tr = None
y_tr = None
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 2. 정답별 측정값 분포 비교하기 | 10점

`stats_df`는 따로 주는 **학습용의 원래 측정값**입니다. 1번 답안이 없어도 씁니다. 정밀 검사 대상(1)과 아닌 것(0)의 반지름·질감이 어떻게 다른지 봅니다.

**(a) [5점]** `label`별로 `mean_radius`와 `mean_texture`의 평균을 구해 `group_mean`에 저장하세요. 행 인덱스는 0, 1이고 열은 이 순서인 DataFrame입니다.

**(b) [5점]** 주어진 `ax`에 `mean_radius`의 히스토그램을 **label별로 하나씩** 두 개 겹쳐 그리세요. 각각 `label='label 0'`, `label='label 1'`을 지정하고 `alpha=0.6`으로 겹친 부분이 보이게 합니다. `bins=20`을 씁니다.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
stats_df = ready_train_table()
print('학습용 수:', len(stats_df))
```

답안 작성

```python
# 작성하세요
# (a) label별 두 측정값의 평균
group_mean = None

# (b) label별 히스토그램
fig, ax = plt.subplots(figsize=(5, 3.5))
# 이곳에 히스토그램 두 개를 그리는 코드를 작성하세요.

ax.set_xlabel('Mean radius')
ax.set_ylabel('Count')
if ax.containers:
    ax.legend()
plt.show()
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 3. 표준화한 뒤 로지스틱 회귀로 분류하기 | 12점

이번에는 표준화를 **직접** 합니다. 준비 셀이 표준화하지 않은 `X_train`, `X_valid`와 정답 `y_train`, `y_valid`를 만듭니다. 평균과 표준편차는 **학습용으로만** 구해야 합니다. 1, 2번 답안은 필요하지 않습니다.

**(a) [6점]** `StandardScaler`를 `scaler`에 만들고, 학습용으로 기준을 정해 변환한 결과를 `X_train_s`에, 같은 기준으로 변환한 검증용을 `X_valid_s`에 저장하세요.

**(b) [6점]** `LogisticRegression(max_iter=1000)`을 `logreg`에 만들어 `X_train_s`, `y_train`으로 학습하고, `X_valid_s`의 예측을 `pred`에 저장하세요.

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
# (a) 표준화
scaler = None
X_train_s = None
X_valid_s = None

# (b) 로지스틱 회귀
logreg = None
pred = None
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 4. 정밀도와 재현율 구하기 | 14점

어떤 분류기의 결과 40개를 줍니다. `actual`은 실제 정답, `guessed`는 예측이고 1이 정밀 검사 대상입니다. 3번 답안은 쓰지 않습니다.

정밀 검사 대상을 **놓치면** 위험하므로, 1을 0으로 잘못 본 개수를 특히 확인합니다.

**(a) [4점]** `confusion_matrix`에 `labels=[0, 1]`을 지정해 2×2 혼동행렬 `cm`을 만드세요. 행이 실제, 열이 예측입니다.

**(b) [6점]** 1을 양성으로 보는 정밀도와 재현율을 구해 `precision`, `recall`에 저장하세요.

**(c) [4점]** `cm`에서 **실제 1인데 0으로 예측한 개수**를 꺼내 `missed`에 저장하세요.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
actual, guessed = load_classification_example()
print('결과 수:', len(actual), '/ 실제 1의 수:', int(actual.sum()))
```

답안 작성

```python
# 작성하세요
# (a) 혼동행렬
cm = None

# (b) 정밀도와 재현율
precision = None
recall = None

# (c) 놓친 정밀 검사 대상의 수
missed = None
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 5. 점수 하나를 내는 이진 분류 신경망 만들기 | 16점

측정값 30개를 받아 **점수 하나**를 내는 신경망을 만듭니다. 구조는 `입력 30 → Linear(출력 16) → ReLU → Linear(출력 1)`이고, 종양 B개를 넣으면 출력은 `(B, 1)`입니다.

손실 함수가 안에서 sigmoid를 계산하므로 모델 끝에 `Sigmoid`를 넣지 마세요. 준비 셀의 정답 `yb`는 0.0/1.0 실수이고 모양이 `(B, 1)`입니다.

**(a) [8점]** `nn.Sequential`로 위 구조의 신경망을 만들어 `net`에 저장하세요.

**(b) [4점]** 점수와 0/1 정답을 받는 이진 분류 손실 함수 `nn.BCEWithLogitsLoss`를 만들어 `loss_fn`에 저장하세요.

**(c) [4점]** `net`의 모든 가중치를 갱신하는 `torch.optim.Adam`을 `optimizer`에 만드세요. 학습률은 0.001입니다.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
seed_all(5)
d = ready_data()
xb = torch.tensor(d['X_train'][:8], dtype=torch.float32)
yb = torch.tensor(d['y_train'][:8], dtype=torch.float32).view(-1, 1)
print('입력 크기:', tuple(xb.shape), '/ 정답 크기:', tuple(yb.shape))
```

답안 작성

```python
# 작성하세요
# (a) 이진 분류 신경망
net = None

# (b) 손실 함수
loss_fn = None

# (c) 가중치 갱신 방법
optimizer = None

# 아래는 확인용입니다. 고치지 마세요.
if net is not None and loss_fn is not None:
    print('출력 크기:', tuple(net(xb).shape), '/ 학습 전 손실:', float(loss_fn(net(xb), yb)))
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 6. 반복 학습하고 손실 그래프 그리기 | 18점

5번과 따로인 신경망 `train_net`(입력 30 → 은닉 12 → 점수 1)과 완성된 두 함수를 줍니다. 함수는 고치지 않습니다.

- `train_one_epoch(model, loader, criterion, opt)`: 1 epoch 학습하고 평균 학습 손실(실수)을 돌려줍니다.
- `validation_loss(model, x, y, criterion)`: 검증 손실(실수)을 돌려줍니다. 가중치는 바꾸지 않습니다.

`loader`는 학습 데이터를 최대 32개씩 묶어 줍니다. 다시 학습하려면 **이 문항의 준비 셀부터** 다시 실행하세요.

**(a) [12점]** `for` 반복문으로 1부터 60까지 60 epoch를 학습하세요. 매 epoch마다 학습 함수를 먼저 부르고 그다음 검증 손실을 구합니다. `epoch`, `train_loss`, `valid_loss` 세 키를 가진 딕셔너리를 `history`에 하나씩 추가하세요.

**(b) [6점]** `history`를 DataFrame `history_df`로 만들고, 주어진 `ax`에 가로축 `epoch`, 세로축 `train_loss`와 `valid_loss`인 선 두 개를 그리세요. 선의 `label`은 각각 `train`, `valid`입니다.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
seed_all(5)
d = ready_data()
train_set = TensorDataset(torch.tensor(d['X_train'], dtype=torch.float32),
                          torch.tensor(d['y_train'], dtype=torch.float32).view(-1, 1))
loader = DataLoader(train_set, batch_size=32, shuffle=True,
                    generator=torch.Generator().manual_seed(5))
xv = torch.tensor(d['X_valid'], dtype=torch.float32)
yv = torch.tensor(d['y_valid'], dtype=torch.float32).view(-1, 1)
train_net = make_practice_model()
train_loss_fn = nn.BCEWithLogitsLoss()
train_opt = torch.optim.Adam(train_net.parameters(), lr=0.005)

def train_one_epoch(model, data_loader, criterion, opt):
    model.train()
    total, count = 0.0, 0
    for batch_x, batch_y in data_loader:
        opt.zero_grad()
        loss = criterion(model(batch_x), batch_y)
        loss.backward()
        opt.step()
        total += loss.item() * len(batch_y)
        count += len(batch_y)
    return total / count

def validation_loss(model, x, y, criterion):
    model.eval()
    with torch.no_grad():
        value = criterion(model(x), y)
    return value.item()

print('모델과 학습 함수를 준비했습니다.')
```

답안 작성

```python
# 작성하세요
# (a) 반복 학습과 기록
history = []
# 이곳에 반복문과 기록 코드를 작성하세요.

# (b) 학습 과정 그래프
history_df = None
fig, ax = plt.subplots(figsize=(5, 3.5))
# 이곳에 두 손실의 변화 그래프를 그리세요.

ax.set_xlabel('Epoch')
ax.set_ylabel('BCE loss')
if ax.lines:
    ax.legend()
plt.show()
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 7. 평가 모드로 확률 구하고 0/1로 바꾸기 | 10점

준비 셀이 Dropout이 들어 있는 모델 `drop_model`(학습하지 않은 상태)과 입력 `sample_x`(`(6, 30)`)를 줍니다. 이 문항에서는 학습하지 않습니다.

Dropout이 켜져 있으면 같은 입력도 결과가 매번 달라집니다. 예측할 때는 평가 모드로 바꾸고 기울기 기록을 끕니다.

**(a) [6점]** `predict_prob(model, x)`를 완성하세요. 평가 모드로 바꾸고, 기울기를 기록하지 않는 범위에서 점수를 구해 sigmoid로 **1일 확률**로 바꾼 뒤, 모양 `(샘플 수,)`인 텐서를 `out`에 저장합니다.

**(b) [4점]** `predict_prob(drop_model, sample_x)`의 결과를 `sample_prob`에 저장하고, 확률이 0.5 **이상**이면 1, 아니면 0인 정수(`long`) 텐서를 `sample_label`에 저장하세요.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
seed_all(13)
drop_model = make_dropout_model()
sample_x = torch.tensor(ready_data()['X_valid'][:6], dtype=torch.float32)
print(drop_model)
```

답안 작성

```python
# 작성하세요
# (a) 1일 확률을 구하는 함수
def predict_prob(model, x):
    out = None
    # 이곳에 평가 모드 설정과 예측 코드를 작성하세요.
    return out

# (b) 확률과 0/1 예측
sample_prob = None
sample_label = None
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 8. 놓치지 않는 기준값 고르기 | 8점

기준 모델이 검증용 종양마다 낸 **1일 확률** `probs`(NumPy 배열)와 실제 정답 `actual`을 줍니다. 앞 문항의 답안은 필요하지 않습니다.

확률이 기준값 **이상**이면 1로 봅니다. 기준값을 낮추면 놓치는 종양이 줄지만 1이라고 잘못 말하는 경우가 늘어납니다. 재현율이 **0.9 이상**인 기준값 가운데 **가장 큰 값**을 고르려고 합니다.

**(a) [4점]** `thresholds`의 기준값마다 재현율을 구해 `recall_by_th`에 저장하세요. 키는 기준값, 값은 재현율인 딕셔너리입니다(예: `{0.3: ..., 0.5: ..., 0.7: ...}`).

**(b) [4점]** 재현율이 0.9 이상인 기준값 중 가장 큰 값을 `chosen_th`에 저장하세요. 그런 기준값이 없으면 `None`입니다.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
actual, probs = load_valid_probs()
thresholds = [0.3, 0.5, 0.7]
print('검증용 수:', len(actual), '/ 확률 예:', probs[:5])
```

답안 작성

```python
# 작성하세요
# (a) 기준값별 재현율
recall_by_th = None

# (b) 고른 기준값
chosen_th = None
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.
