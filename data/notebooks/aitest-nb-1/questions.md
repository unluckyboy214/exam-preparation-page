# AI 실기 노트북 모의고사 1회

> 답안과 실행 결과는 `student.ipynb`에 작성합니다. 이 문서는 문제지입니다.

식물 연구소가 붓꽃의 꽃받침과 꽃잎 길이·너비를 측정했습니다. 측정값 4개로 꽃이 세 품종 중 어느 것인지 예측하려고 합니다. 품종 이름 대신 **0, 1, 2** 번호를 쓰며, 이 번호는 크기나 순서를 뜻하지 않습니다.

이 모의고사는 세 범주 중 하나를 고르는 **분류**를 다룹니다. 신경망은 꽃마다 품종 0, 1, 2에 대한 점수 세 개를 출력합니다.

**총 8문항, 100점, 시험 120분**

- 공통 준비 셀을 먼저 실행하고, 각 문항 안의 셀은 위에서 아래로 실행하세요. 문항마다 필요한 자료를 따로 주므로 다른 문항의 답안은 필요하지 않습니다. 같은 문항의 (b), (c)는 앞 소문항의 결과를 써도 됩니다.
- `실행만 하세요` 셀은 고치지 않습니다. `작성하세요` 셀의 `None`이나 빈 곳을 코드로 바꾸세요. 중간 변수를 더하거나 여러 줄로 써도 됩니다. 정해진 변수 이름과 함수의 입력·반환 형식은 지키세요.
- 특정 정확도에 도달해야 하는 것은 아닙니다. 요구한 처리, 학습, 평가 과정을 수행하세요.
- 각 문항의 `확인` 셀을 실행하면 소문항별로 통과 여부와 점수를 보여 줍니다. 마지막 셀에서 총점을 확인하세요.
- 인터넷과 생성형 AI는 쓰지 않습니다. 필요한 데이터는 scikit-learn에 들어 있습니다.

## 데이터 안내

scikit-learn에 들어 있는 붓꽃(iris) 측정값 150개를 섞어서 씁니다.

| 제공 자료 | 의미 |
|---|---|
| `dev` | 정답이 있는 개발용 데이터 120개. 1번에서 학습용과 검증용으로 나눕니다. |
| `new_samples` | 정답 `label`이 없는 새 꽃 30개. 8번에서 이 꽃들의 점수를 씁니다. |
| `flower_id` | 꽃 번호(`F001` 형태). 모델 입력으로 쓰지 않습니다. |
| `label` | 예측할 품종 번호. 정수 0, 1, 2 중 하나입니다. |
| `feature_cols` | 입력으로 쓸 측정값 열 4개의 이름 목록입니다. |

입력 열은 `sepal_length`(꽃받침 길이), `sepal_width`(꽃받침 너비), `petal_length`(꽃잎 길이), `petal_width`(꽃잎 너비)이고 단위는 cm입니다. 결측치는 없습니다.

필요한 문항에는 **학습용으로만 구한 평균과 표준편차로 표준화한 입력**을 따로 줍니다. 검증용에도 같은 기준을 적용했습니다.

## 문항 구성

| 문항 | 내용 | 배점 |
|---|---|---|
| 1 | 품종 비율을 지키며 데이터 나누기 | 12점 |
| 2 | 꽃잎 측정값 분포 살펴보기 | 10점 |
| 3 | 결정 트리로 품종 분류하기 | 12점 |
| 4 | 정확도와 품종별 맞힌 비율 구하기 | 14점 |
| 5 | 세 품종을 구분하는 신경망 만들기 | 16점 |
| 6 | 한 epoch 학습 함수 쓰고 반복 학습하기 | 18점 |
| 7 | Dropout을 넣고 평가 모드로 품종 예측하기 | 10점 |
| 8 | 확률 차이가 작은 꽃 골라내기 | 8점 |

## 1. 품종 비율을 지키며 데이터 나누기 | 12점

`dev`는 공통 준비 셀에서 읽은 pandas DataFrame입니다. 한 행이 꽃 하나이고 정답 열은 `label`입니다. 품종별 개수를 확인한 뒤 전체의 80%를 학습용, 20%를 검증용으로 나눕니다. **두 데이터에 품종이 비슷한 비율로 들어가도록** 나누세요.

**(a) [4점]** `dev`에서 품종별 꽃 수를 세어 `counts`에 저장하세요. 품종 번호 0, 1, 2 순서로 정렬된 pandas Series여야 합니다.

**(b) [5점]** `train_test_split`으로 `dev`를 나누어 `train_df`, `valid_df`에 저장하세요. `test_size=0.2`, `random_state=7`을 쓰고, `stratify`에는 품종 정답을 넘기세요. 모든 열과 원래 행 인덱스를 그대로 둡니다.

**(c) [3점]** `valid_df`의 품종별 **비율**(0~1)을 구해 `valid_ratio`에 저장하세요. 품종 번호 0, 1, 2 순서의 pandas Series입니다.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
print('dev:', dev.shape)
```

답안 작성

```python
# 작성하세요
# (a) 품종별 개수
counts = None

# (b) 학습용과 검증용 나누기
train_df = None
valid_df = None

# (c) 검증용의 품종별 비율
valid_ratio = None
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 2. 꽃잎 측정값 분포 살펴보기 | 10점

`stats_df`는 따로 주는 **학습용 꽃 96개**의 원래 측정값입니다. 1번 답안이 없어도 쓸 수 있습니다. 꽃잎 길이와 너비가 품종마다 어떻게 다른지 확인합니다.

**(a) [5점]** 품종별로 `petal_length`의 평균과 표준편차를 구해 `group_stat`에 저장하세요. 행 인덱스는 품종 0, 1, 2이고, 열은 `mean`, `std` 순서인 DataFrame입니다. (`agg`를 쓰면 편합니다)

**(b) [5점]** 주어진 좌표축 `ax`에 산점도를 그리세요. 가로축은 `petal_length`, 세로축은 `petal_width`이고, 점의 색이 `label`에 따라 달라야 합니다.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
stats_df = ready_train_table()
print('학습용 꽃 수:', len(stats_df))
```

답안 작성

```python
# 작성하세요
# (a) 품종별 꽃잎 길이의 평균과 표준편차
group_stat = None

# (b) 산점도
fig, ax = plt.subplots(figsize=(5, 3.5))
# 이곳에 산점도를 그리는 코드를 작성하세요.

ax.set_xlabel('Petal length (cm)')
ax.set_ylabel('Petal width (cm)')
ax.set_title('Training flowers by class')
plt.show()
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 3. 결정 트리로 품종 분류하기 | 12점

결정 트리는 "꽃잎 길이가 2.5cm보다 작은가?" 같은 질문을 차례로 던져 품종을 정합니다. 질문의 깊이는 **3단계**까지로 제한합니다.

준비 셀이 표준화한 `X_train`(96행, 4열), `X_valid`(24행, 4열)와 정답 `y_train`, `y_valid`를 만듭니다. 1번과 2번 답안은 필요하지 않습니다.

**(a) [5점]** `DecisionTreeClassifier`로 `max_depth=3`, `random_state=0`인 모델 `tree`를 만들고 `X_train`, `y_train`으로 학습하세요.

**(b) [4점]** 학습한 모델로 `X_valid`의 품종을 예측해 `pred`에 저장하세요. 길이 24의 배열입니다.

**(c) [3점]** `X_valid`의 품종별 예측 확률을 구해 `proba`에 저장하세요. 모양은 `(24, 3)`입니다.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
d = ready_data()
X_train, X_valid = d['X_train'], d['X_valid']
y_train, y_valid = d['y_train'], d['y_valid']
print('학습 입력:', X_train.shape, '/ 검증 입력:', X_valid.shape)
```

답안 작성

```python
# 작성하세요
# (a) 모델 만들기와 학습
tree = None

# (b) 검증 데이터의 품종 예측
pred = None

# (c) 품종별 예측 확률
proba = None
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 4. 정확도와 품종별 맞힌 비율 구하기 | 14점

어떤 분류기의 결과 30개를 따로 줍니다. `actual`은 실제 품종, `guessed`는 예측 품종이며 같은 위치끼리 같은 꽃입니다. 3번 답안은 쓰지 않습니다.

혼동행렬은 **행이 실제 품종, 열이 예측 품종**이고 둘 다 0, 1, 2 순서입니다. `cm[1, 2]`는 실제 품종 1을 2로 잘못 예측한 개수입니다.

**(a) [4점]** 정확도를 계산해 `acc`에 저장하세요. 백분율이 아니라 0~1 사이의 비율입니다.

**(b) [5점]** `confusion_matrix`에 `labels=[0, 1, 2]`를 지정해 3×3 혼동행렬 `cm`을 만드세요.

**(c) [5점]** `cm`을 이용해 **실제 품종별로 맞힌 비율**을 구해 `recall_each`에 저장하세요. 길이 3의 NumPy 배열이며, k번째 값은 "실제 품종 k인 꽃 중 k로 맞힌 비율"입니다.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
actual, guessed = load_classification_example()
print('결과 수:', len(actual))
```

답안 작성

```python
# 작성하세요
# (a) 정확도
acc = None

# (b) 혼동행렬
cm = None

# (c) 실제 품종별 맞힌 비율
recall_each = None
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 5. 세 품종을 구분하는 신경망 만들기 | 16점

측정값 4개를 받아 **품종 세 개의 점수**를 내는 신경망을 만듭니다. 구조는 `입력 4 → Linear(출력 10) → ReLU → Linear(출력 10) → ReLU → Linear(출력 3)`입니다. 꽃 B개를 넣으면 출력은 `(B, 3)`입니다.

점수는 확률이 아닙니다. 모델 끝에 Softmax를 넣지 마세요. 정답은 0, 1, 2 번호 그대로 씁니다.

**(a) [8점]** `nn.Sequential`로 위 구조의 신경망을 만들어 `net`에 저장하세요.

**(b) [4점]** 다중 분류 손실 함수 `nn.CrossEntropyLoss`를 만들어 `loss_fn`에 저장하세요.

**(c) [4점]** `net`의 모든 가중치를 갱신하는 `torch.optim.SGD`를 만들어 `optimizer`에 저장하세요. 학습률 `lr`은 0.05입니다.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
seed_all(7)
d = ready_data()
xb = torch.tensor(d['X_train'][:6], dtype=torch.float32)
yb = torch.tensor(d['y_train'][:6], dtype=torch.long)
print('입력 크기:', tuple(xb.shape), '/ 정답 크기:', tuple(yb.shape))
```

답안 작성

```python
# 작성하세요
# (a) 분류 신경망
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

## 6. 한 epoch 학습 함수 쓰고 반복 학습하기 | 18점

5번과 따로인 신경망 `train_net`(입력 4 → 은닉 8 → 점수 3)을 줍니다. `loader`는 학습 데이터를 최대 16개씩 묶어 줍니다. 검증 손실을 구하는 `validation_loss`는 완성되어 있습니다.

이번에는 **한 epoch를 학습하는 함수를 직접 완성**합니다. 답안을 고쳐 다시 학습하려면 **이 문항의 준비 셀부터** 다시 실행하세요.

**(a) [8점]** `train_one_epoch(model, data_loader, criterion, opt)`를 완성하세요. 배치마다 **기울기 초기화 → 점수 계산 → 손실 계산(`loss`에 저장) → 기울기 계산 → 가중치 갱신**을 합니다. 평균 손실을 구하는 줄은 이미 있습니다. 함수 안에서는 인자로 받은 이름(`model`, `criterion`, `opt`)만 쓰세요.

**(b) [6점]** `for` 반복문으로 1부터 50까지 50 epoch를 학습하세요. 매 epoch마다 `train_one_epoch(train_net, loader, train_loss_fn, train_opt)`를 먼저 부르고, 그다음 `validation_loss(train_net, xv, yv, train_loss_fn)`를 부릅니다. `epoch`, `train_loss`, `valid_loss` 세 키를 가진 딕셔너리를 `history`에 하나씩 추가하세요.

**(c) [4점]** `history`를 DataFrame `history_df`로 만들고, 검증 손실이 가장 작은 epoch 번호(정수)를 `best_epoch`에 저장하세요.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
seed_all(7)
d = ready_data()
train_set = TensorDataset(torch.tensor(d['X_train'], dtype=torch.float32),
                          torch.tensor(d['y_train'], dtype=torch.long))
loader = DataLoader(train_set, batch_size=16, shuffle=True,
                    generator=torch.Generator().manual_seed(7))
xv = torch.tensor(d['X_valid'], dtype=torch.float32)
yv = torch.tensor(d['y_valid'], dtype=torch.long)
train_net = make_practice_model()
train_loss_fn = nn.CrossEntropyLoss()
train_opt = torch.optim.Adam(train_net.parameters(), lr=0.01)

def validation_loss(model, x, y, criterion):
    model.eval()
    with torch.no_grad():
        value = criterion(model(x), y)
    return value.item()

print('모델과 데이터를 준비했습니다.')
```

답안 작성

```python
# 작성하세요
# (a) 한 epoch 학습 함수
def train_one_epoch(model, data_loader, criterion, opt):
    model.train()
    total, count = 0.0, 0
    for batch_x, batch_y in data_loader:
        loss = None
        # 이곳에 기울기 초기화, 점수와 손실 계산, 기울기 계산, 가중치 갱신 코드를 작성하세요.

        total += loss.item() * len(batch_y)
        count += len(batch_y)
    return total / count

# (b) 반복 학습과 기록
history = []
# 이곳에 반복문을 작성하세요.

# (c) 기록 표와 가장 좋은 epoch
history_df = None
best_epoch = None
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 7. Dropout을 넣고 평가 모드로 품종 예측하기 | 10점

Dropout은 학습할 때 중간 출력의 일부를 무작위로 0으로 바꿔 학습 데이터만 외우는 것을 줄입니다. 예측할 때는 꺼야 합니다. 이 문항에서는 학습하지 않습니다.

새 모델은 `입력 4 → Linear(출력 32) → ReLU → Dropout → Linear(출력 3)` 순서입니다. `sample_x`는 `(5, 4)` 텐서입니다.

**(a) [6점]** `nn.Sequential`로 위 구조의 모델을 만들어 `drop_net`에 저장하세요. `nn.Dropout`의 `p`는 0.3이고 ReLU 바로 뒤에 둡니다.

**(b) [4점]** `predict_labels(model, x)`를 완성하세요. 모델을 평가 모드로 바꾸고, 기울기를 기록하지 않는 범위에서 점수를 구한 뒤, 꽃마다 점수가 가장 큰 **품종 번호**를 `out`에 저장합니다. `out`의 모양은 `(꽃 수,)`입니다.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
seed_all(11)
sample_x = torch.tensor(ready_data()['X_valid'][:5], dtype=torch.float32)
```

답안 작성

```python
# 작성하세요
# (a) Dropout이 있는 신경망
drop_net = None

# (b) 평가 모드로 품종 번호 예측
def predict_labels(model, x):
    out = None
    # 이곳에 평가 모드 설정과 예측 코드를 작성하세요.
    return out

if drop_net is not None:
    print('예측 품종:', predict_labels(drop_net, sample_x))
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.

## 8. 확률 차이가 작은 꽃 골라내기 | 8점

기준 모델이 새 꽃 30개에 대해 낸 점수를 줍니다. `scores`는 `(30, 3)` 텐서이고, `ids`는 같은 순서의 꽃 번호를 담은 NumPy 배열입니다.

점수를 softmax로 바꾼 뒤, **가장 큰 확률과 두 번째로 큰 확률의 차이**가 0.2 **이하**인 꽃을 다시 확인하려고 합니다. 차이가 정확히 0.2여도 다시 확인합니다.

**(a) [4점]** 꽃마다 softmax를 적용해 `probs`(`(30, 3)` 텐서)에 저장하고, 가장 큰 확률의 품종 번호를 `labels`(`(30,)` 텐서)에 저장하세요.

**(b) [4점]** 가장 큰 확률 - 두 번째로 큰 확률을 `margin`(`(30,)` 텐서)에 저장하고, `margin`이 0.2 이하인 꽃 번호만 `ids`에서 골라 `review_ids`에 저장하세요. `review_ids`는 입력 순서를 지키는 1차원 NumPy 배열입니다.

준비 코드 - 실행만 하세요

```python
# 실행만 하세요
ids, saved_scores = load_reference_scores()
scores = torch.tensor(saved_scores, dtype=torch.float32)
print('점수 크기:', tuple(scores.shape))
```

답안 작성

```python
# 작성하세요
# (a) 확률과 예측 품종
probs = None
labels = None

# (b) 확률 차이와 다시 확인할 꽃
margin = None
review_ids = None
```

작성한 뒤 Notebook의 확인 셀을 실행하세요.
