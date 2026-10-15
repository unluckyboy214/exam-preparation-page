"""AI 실기 노트북 모의고사 1회 - 자동 확인

노트북의 확인 셀에서 check.qN(globals())로 부릅니다. 이 파일은 고치지 않습니다.
정답 여부만 알려 주며, 실제 시험의 채점 기준과 똑같지는 않습니다.
"""
import copy

import numpy as np
import pandas as pd
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.tree import DecisionTreeClassifier

import practice_support as ps

_scores = {}
_full = {}


# ---------- 공통 도우미 ----------
class Fail(Exception):
    pass


def need(g, name):
    if name not in g:
        raise Fail(f"`{name}` 변수가 없어요")
    if g[name] is None:
        raise Fail(f"`{name}`이(가) 아직 None이에요")
    return g[name]


def expect(ok, msg):
    if not ok:
        raise Fail(msg)


def _run(no, items):
    got = 0
    print(f"[{no}번 확인]")
    for label, pts, fn in items:
        try:
            fn()
            ok, msg = True, ""
        except Fail as e:
            ok, msg = False, str(e)
        except Exception as e:  # 답안 코드의 오류도 실패로 보여 준다
            ok, msg = False, f"확인 중 오류 - {type(e).__name__}: {e}"
        got += pts if ok else 0
        print(f"  ({label}) [{pts}점] {'✓ 통과' if ok else '✗ 다시 확인'}" + (f": {msg}" if msg else ""))
    full = sum(p for _, p, _ in items)
    _scores[no], _full[no] = got, full
    print(f"  → {got} / {full}점")


def total(points=None, record_url=None):
    """확인한 문항의 점수를 모은다. points: 문항별 배점, record_url: 사이트 기록 주소"""
    if not _scores:
        print("아직 확인한 문항이 없어요. 각 문항의 확인 셀을 먼저 실행하세요.")
        return
    points = list(points) if points else [_full.get(no, 0) for no in range(1, max(_full) + 1)]
    got, detail = 0, []
    for no, full in enumerate(points, start=1):
        if no in _scores:
            got += _scores[no]
            detail.append(str(_scores[no]))
            print(f"{no}번: {_scores[no]} / {full}점")
        else:
            detail.append("-")
            print(f"{no}번: 확인 안 함 (0 / {full}점)")
    print(f"총점: {got} / {sum(points)}점")
    if record_url:
        import time
        _show_link(f"{record_url}&s={','.join(detail)}&t={int(time.time() * 1000)}")


def _show_link(url):
    """사이트에 기록하기 링크를 보여 준다 (Jupyter·Colab에서는 누를 수 있는 링크)"""
    print()
    print("아래 링크를 누르면 사이트의 '내 기록'에 이 점수가 저장돼요.")
    try:
        from IPython.display import HTML, display
        display(HTML(f'<a href="{url}" target="_blank" rel="noopener">사이트에 기록하기</a>'))
    except ImportError:
        pass
    print(url)


def layers(model):
    expect(isinstance(model, nn.Sequential), "nn.Sequential로 만들어야 해요")
    return list(model.children())


def linear_is(layer, n_in, n_out):
    return isinstance(layer, nn.Linear) and layer.in_features == n_in and layer.out_features == n_out


def scatter_points(ax):
    cols = [c for c in ax.collections if len(c.get_offsets())]
    expect(cols, "ax에 산점도가 없어요 (ax.scatter를 쓰세요)")
    pts = np.concatenate([np.asarray(c.get_offsets()) for c in cols])
    colored = len(cols) >= 2 or (
        cols[0].get_array() is not None and len(np.unique(cols[0].get_array())) >= 2
    ) or len(np.unique(cols[0].get_facecolors(), axis=0)) >= 2
    return pts, colored


def same_points(pts, x, y):
    """점의 순서와 상관없이 같은 (x, y) 점들인지"""
    a = np.asarray(pts, dtype=float)
    b = np.c_[np.asarray(x, dtype=float), np.asarray(y, dtype=float)]
    if a.shape != b.shape:
        return False
    sa, sb = np.lexsort((a[:, 1], a[:, 0])), np.lexsort((b[:, 1], b[:, 0]))
    return np.allclose(a[sa], b[sb])


# ---------- 문항별 확인 ----------
def q1(g):
    dev, _, _ = ps.load_tables()
    ref_train, ref_valid = ps._split()

    def a():
        counts = need(g, "counts")
        expect(isinstance(counts, pd.Series), "pandas Series여야 해요")
        expect(list(counts.index) == [0, 1, 2], "인덱스가 품종 0, 1, 2 순서여야 해요 (sort_index)")
        expect(list(counts.values) == list(dev["label"].value_counts().sort_index().values), "개수가 달라요")

    def b():
        tr, va = need(g, "train_df"), need(g, "valid_df")
        expect(isinstance(tr, pd.DataFrame) and isinstance(va, pd.DataFrame), "DataFrame이어야 해요")
        expect(list(tr.columns) == list(dev.columns), "모든 열을 그대로 두어야 해요")
        expect(len(tr) == 96 and len(va) == 24, f"크기가 96 / 24여야 해요 (현재 {len(tr)} / {len(va)})")
        expect(list(tr.index) == list(ref_train.index) and list(va.index) == list(ref_valid.index),
               "분할 결과가 달라요. test_size, random_state, stratify를 확인하세요")

    def c():
        ratio = need(g, "valid_ratio")
        ref = ref_valid["label"].value_counts(normalize=True).sort_index()
        expect(isinstance(ratio, pd.Series), "pandas Series여야 해요")
        expect(list(ratio.index) == [0, 1, 2], "인덱스가 품종 0, 1, 2 순서여야 해요")
        expect(np.allclose(ratio.values, ref.values), "비율이 달라요 (개수가 아니라 0~1 비율)")

    _run(1, [("a", 4, a), ("b", 5, b), ("c", 3, c)])


def q2(g):
    stats = ps.ready_train_table()

    def a():
        gs = need(g, "group_stat")
        ref = stats.groupby("label")["petal_length"].agg(["mean", "std"])
        expect(isinstance(gs, pd.DataFrame), "DataFrame이어야 해요")
        expect(list(gs.index) == [0, 1, 2], "행 인덱스가 품종 0, 1, 2여야 해요")
        expect(list(gs.columns) == ["mean", "std"], "열이 mean, std 순서여야 해요")
        expect(np.allclose(gs.values, ref.values), "값이 달라요")

    def b():
        ax = need(g, "ax")
        pts, colored = scatter_points(ax)
        expect(same_points(pts, stats["petal_length"], stats["petal_width"]),
               "가로축 petal_length, 세로축 petal_width의 학습 시료 96개를 그려야 해요")
        expect(colored, "점의 색이 품종에 따라 달라야 해요")

    _run(2, [("a", 5, a), ("b", 5, b)])


def q3(g):
    d = ps.ready_data()
    ref = DecisionTreeClassifier(max_depth=3, random_state=0).fit(d["X_train"], d["y_train"])

    def a():
        tree = need(g, "tree")
        expect(isinstance(tree, DecisionTreeClassifier), "DecisionTreeClassifier여야 해요")
        p = tree.get_params()
        expect(p["max_depth"] == 3 and p["random_state"] == 0, "max_depth=3, random_state=0을 지정하세요")
        expect(hasattr(tree, "classes_"), "fit으로 학습하세요")

    def b():
        pred = np.asarray(need(g, "pred"))
        expect(pred.shape == (24,), f"길이 24의 배열이어야 해요 (현재 {pred.shape})")
        expect(np.array_equal(pred, ref.predict(d["X_valid"])), "예측이 달라요. X_train으로 학습했는지 확인하세요")

    def c():
        proba = np.asarray(need(g, "proba"))
        expect(proba.shape == (24, 3), f"(24, 3)이어야 해요 (현재 {proba.shape})")
        expect(np.allclose(proba, ref.predict_proba(d["X_valid"])), "확률이 달라요 (predict_proba)")

    _run(3, [("a", 5, a), ("b", 4, b), ("c", 3, c)])


def q4(g):
    actual, guessed = ps.load_classification_example()
    ref_cm = confusion_matrix(actual, guessed, labels=[0, 1, 2])

    def a():
        acc = float(need(g, "acc"))
        expect(abs(acc - accuracy_score(actual, guessed)) < 1e-9, "정확도가 달라요 (0~1 비율)")

    def b():
        cm = np.asarray(need(g, "cm"))
        expect(cm.shape == (3, 3), "3×3이어야 해요")
        expect(np.array_equal(cm, ref_cm), "행 = 실제, 열 = 예측인지, 인자 순서(정답, 예측)를 확인하세요")

    def c():
        r = np.asarray(need(g, "recall_each"), dtype=float)
        expect(r.shape == (3,), f"길이 3의 배열이어야 해요 (현재 {r.shape})")
        expect(np.allclose(r, ref_cm.diagonal() / ref_cm.sum(axis=1)), "실제 품종별로 맞힌 비율이어야 해요 (행 합으로 나누기)")

    _run(4, [("a", 4, a), ("b", 5, b), ("c", 5, c)])


def q5(g):
    def a():
        ls = layers(need(g, "net"))
        expect(len(ls) == 5, f"층이 5개여야 해요 (현재 {len(ls)}개)")
        ok = (linear_is(ls[0], 4, 10) and isinstance(ls[1], nn.ReLU) and linear_is(ls[2], 10, 10)
              and isinstance(ls[3], nn.ReLU) and linear_is(ls[4], 10, 3))
        expect(ok, "Linear(4, 10) → ReLU → Linear(10, 10) → ReLU → Linear(10, 3) 순서여야 해요")

    def b():
        expect(isinstance(need(g, "loss_fn"), nn.CrossEntropyLoss), "nn.CrossEntropyLoss()를 만들어야 해요")

    def c():
        opt, net = need(g, "optimizer"), need(g, "net")
        expect(isinstance(opt, torch.optim.SGD), "torch.optim.SGD여야 해요")
        group = opt.param_groups[0]
        expect(abs(group["lr"] - 0.05) < 1e-12, "lr=0.05를 지정하세요")
        given = {id(p) for gr in opt.param_groups for p in gr["params"]}
        expect(given == {id(p) for p in net.parameters()}, "net.parameters()를 넘겨야 해요")

    _run(5, [("a", 8, a), ("b", 4, b), ("c", 4, c)])


def _ref_epoch(model, loader, criterion, opt):
    model.train()
    total, count = 0.0, 0
    for bx, by in loader:
        opt.zero_grad()
        loss = criterion(model(bx), by)
        loss.backward()
        opt.step()
        total += loss.item() * len(by)
        count += len(by)
    return total / count


def q6(g):
    d = ps.ready_data()

    def a():
        fn = need(g, "train_one_epoch")
        data = TensorDataset(torch.tensor(d["X_train"]), torch.tensor(d["y_train"]))
        loader = DataLoader(data, batch_size=16, shuffle=False)
        m1 = ps.make_practice_model()
        m2 = copy.deepcopy(m1)
        o1 = torch.optim.Adam(m1.parameters(), lr=0.01)
        o2 = torch.optim.Adam(m2.parameters(), lr=0.01)
        v1 = fn(m1, loader, nn.CrossEntropyLoss(), o1)
        v2 = _ref_epoch(m2, loader, nn.CrossEntropyLoss(), o2)
        expect(isinstance(v1, float), "평균 손실을 실수로 돌려줘야 해요")
        expect(abs(v1 - v2) < 1e-5, "평균 손실이 달라요")
        same = all(torch.allclose(p, q) for p, q in zip(m1.parameters(), m2.parameters()))
        expect(same, "가중치 갱신 결과가 달라요. zero_grad → 손실 → backward → step 순서를 확인하세요")

    def b():
        h = need(g, "history")
        expect(isinstance(h, list) and len(h) == 50, f"history에 50개를 기록해야 해요 (현재 {len(h) if isinstance(h, list) else '리스트 아님'})")
        expect(all(isinstance(r, dict) and set(r) == {"epoch", "train_loss", "valid_loss"} for r in h),
               "각 기록은 epoch, train_loss, valid_loss 키를 가진 딕셔너리여야 해요")
        expect([r["epoch"] for r in h] == list(range(1, 51)), "epoch는 1부터 50까지여야 해요")
        expect(all(isinstance(r["train_loss"], float) and isinstance(r["valid_loss"], float) for r in h),
               "손실은 실수(float)로 저장하세요")
        expect(h[-1]["train_loss"] < h[0]["train_loss"], "학습 손실이 줄지 않았어요. 학습 함수를 호출했는지 확인하세요")

    def c():
        hd, best = need(g, "history_df"), need(g, "best_epoch")
        expect(isinstance(hd, pd.DataFrame) and len(hd) == 50, "50행의 DataFrame이어야 해요")
        ref = int(hd.loc[hd["valid_loss"].idxmin(), "epoch"])
        expect(int(best) == ref, f"검증 손실이 가장 작은 epoch가 아니에요 (기대 {ref})")

    _run(6, [("a", 8, a), ("b", 6, b), ("c", 4, c)])


def q7(g):
    x = torch.tensor(ps.ready_data()["X_valid"][:5])

    def a():
        ls = layers(need(g, "drop_net"))
        ok = (len(ls) == 4 and linear_is(ls[0], 4, 32) and isinstance(ls[1], nn.ReLU)
              and isinstance(ls[2], nn.Dropout) and linear_is(ls[3], 32, 3))
        expect(ok, "Linear(4, 32) → ReLU → Dropout → Linear(32, 3) 순서여야 해요")
        expect(abs(ls[2].p - 0.3) < 1e-12, "Dropout의 p는 0.3이에요")

    def b():
        fn, net = need(g, "predict_labels"), need(g, "drop_net")
        net.train()
        out1, out2 = fn(net, x), fn(net, x)
        expect(isinstance(out1, torch.Tensor) and tuple(out1.shape) == (5,), "모양 (5,)의 텐서를 돌려줘야 해요")
        expect(not net.training, "model.eval()로 평가 모드로 바꾸세요")
        expect(not out1.requires_grad, "torch.no_grad() 안에서 계산하세요")
        expect(torch.equal(out1, out2), "같은 입력이면 결과가 같아야 해요")
        with torch.no_grad():
            ref = net(x).argmax(dim=1)
        expect(torch.equal(out1.long(), ref), "품종 번호(argmax, dim=1)를 돌려줘야 해요")

    _run(7, [("a", 6, a), ("b", 4, b)])


def q8(g):
    ids, saved = ps.load_reference_scores()
    probs_ref = torch.softmax(torch.tensor(saved), dim=1)
    top2 = torch.topk(probs_ref, 2, dim=1).values
    margin_ref = top2[:, 0] - top2[:, 1]

    def a():
        probs, labels = need(g, "probs"), need(g, "labels")
        expect(isinstance(probs, torch.Tensor) and tuple(probs.shape) == (30, 3), "probs는 (30, 3) 텐서여야 해요")
        expect(torch.allclose(probs, probs_ref, atol=1e-6), "행마다 합이 1인 softmax(dim=1)여야 해요")
        expect(isinstance(labels, torch.Tensor) and torch.equal(labels.long(), probs_ref.argmax(dim=1)), "labels가 달라요")

    def b():
        margin, review = need(g, "margin"), need(g, "review_ids")
        expect(isinstance(margin, torch.Tensor) and tuple(margin.shape) == (30,), "margin은 (30,) 텐서여야 해요")
        expect(torch.allclose(margin, margin_ref, atol=1e-6), "가장 큰 확률 - 두 번째로 큰 확률이어야 해요")
        expect(isinstance(review, np.ndarray) and review.ndim == 1, "1차원 NumPy 배열이어야 해요")
        expect(np.array_equal(review, ids[(margin_ref <= 0.2).numpy()]), "0.2 '이하'인 꽃 번호를 입력 순서대로 골라야 해요")

    _run(8, [("a", 4, a), ("b", 4, b)])
