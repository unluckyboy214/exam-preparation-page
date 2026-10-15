"""AI 실기 노트북 모의고사 2회 - 자동 확인

노트북의 확인 셀에서 check.qN(globals())로 부릅니다. 이 파일은 고치지 않습니다.
정답 여부만 알려 주며, 실제 시험의 채점 기준과 똑같지는 않습니다.
"""
import numpy as np
import pandas as pd
import torch
from torch import nn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix, precision_score, recall_score
from sklearn.preprocessing import StandardScaler

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
    dev, _, feats = ps.load_tables()
    ref_train, ref_valid = ps._split()

    def a():
        rate = float(need(g, "pos_rate"))
        expect(abs(rate - dev["label"].mean()) < 1e-9, "label이 1인 비율(0~1)이어야 해요")

    def b():
        tr, va = need(g, "train_df"), need(g, "valid_df")
        expect(isinstance(tr, pd.DataFrame) and isinstance(va, pd.DataFrame), "DataFrame이어야 해요")
        expect(list(tr.columns) == list(dev.columns), "모든 열을 그대로 두어야 해요")
        expect(list(tr.index) == list(ref_train.index) and list(va.index) == list(ref_valid.index),
               "분할 결과가 달라요. test_size, random_state, stratify를 확인하세요")

    def c():
        X, y = np.asarray(need(g, "X_tr")), np.asarray(need(g, "y_tr"))
        expect(X.shape == (len(ref_train), 30), f"X_tr는 ({len(ref_train)}, 30)이어야 해요 (현재 {X.shape})")
        expect(np.allclose(X, ref_train[feats].to_numpy(dtype=float)), "feature_cols의 열만 순서대로 담아야 해요")
        expect(np.array_equal(y, ref_train["label"].to_numpy()), "y_tr는 train_df의 label이어야 해요")

    _run(1, [("a", 3, a), ("b", 6, b), ("c", 3, c)])


def q2(g):
    stats = ps.ready_train_table()

    def a():
        gm = need(g, "group_mean")
        ref = stats.groupby("label")[["mean_radius", "mean_texture"]].mean()
        expect(isinstance(gm, pd.DataFrame), "DataFrame이어야 해요")
        expect(list(gm.index) == [0, 1], "행 인덱스가 label 0, 1이어야 해요")
        expect(list(gm.columns) == ["mean_radius", "mean_texture"], "열이 mean_radius, mean_texture 순서여야 해요")
        expect(np.allclose(gm.values, ref.values), "값이 달라요")

    def b():
        ax = need(g, "ax")
        bars = [c for c in ax.containers if len(c)]
        expect(len(bars) >= 2, "ax.hist를 label별로 두 번 불러 히스토그램 두 개를 그려야 해요")
        heights = sorted(round(sum(p.get_height() for p in c)) for c in bars[:2])
        expect(heights == sorted(stats["label"].value_counts().tolist()), "label 0과 1의 mean_radius를 따로 그려야 해요")
        labels = {t.get_text() for t in (ax.get_legend().get_texts() if ax.get_legend() else [])}
        expect({"label 0", "label 1"} <= labels, "label='label 0', 'label 1'을 지정해야 범례에 나와요")

    _run(2, [("a", 5, a), ("b", 5, b)])


def q3(g):
    raw = ps.ready_raw_xy()
    sc = StandardScaler().fit(raw["X_train"])
    ref_tr, ref_va = sc.transform(raw["X_train"]), sc.transform(raw["X_valid"])
    ref_model = LogisticRegression(max_iter=1000).fit(ref_tr, raw["y_train"])

    def a():
        scaler = need(g, "scaler")
        expect(isinstance(scaler, StandardScaler), "StandardScaler여야 해요")
        tr, va = np.asarray(need(g, "X_train_s")), np.asarray(need(g, "X_valid_s"))
        expect(np.allclose(tr, ref_tr), "X_train_s가 달라요 (학습용에 fit_transform)")
        expect(np.allclose(va, ref_va), "X_valid_s가 달라요. 검증용에는 transform만 하세요")

    def b():
        model = need(g, "logreg")
        expect(isinstance(model, LogisticRegression) and model.get_params()["max_iter"] == 1000,
               "LogisticRegression(max_iter=1000)이어야 해요")
        pred = np.asarray(need(g, "pred"))
        expect(np.array_equal(pred, ref_model.predict(ref_va)), "예측이 달라요. 표준화한 입력으로 학습·예측했는지 확인하세요")

    _run(3, [("a", 6, a), ("b", 6, b)])


def q4(g):
    actual, guessed = ps.load_classification_example()
    ref_cm = confusion_matrix(actual, guessed, labels=[0, 1])

    def a():
        cm = np.asarray(need(g, "cm"))
        expect(cm.shape == (2, 2) and np.array_equal(cm, ref_cm), "행 = 실제, 열 = 예측인 2×2 혼동행렬이어야 해요")

    def b():
        p, r = float(need(g, "precision")), float(need(g, "recall"))
        expect(abs(p - precision_score(actual, guessed)) < 1e-9, "precision이 달라요 (예측 1 중 실제 1)")
        expect(abs(r - recall_score(actual, guessed)) < 1e-9, "recall이 달라요 (실제 1 중 예측 1)")

    def c():
        expect(int(need(g, "missed")) == int(ref_cm[1, 0]), "실제 1인데 0으로 예측한 개수(FN)여야 해요")

    _run(4, [("a", 4, a), ("b", 6, b), ("c", 4, c)])


def q5(g):
    def a():
        ls = layers(need(g, "net"))
        ok = len(ls) == 3 and linear_is(ls[0], 30, 16) and isinstance(ls[1], nn.ReLU) and linear_is(ls[2], 16, 1)
        expect(ok, "Linear(30, 16) → ReLU → Linear(16, 1) 순서여야 해요 (끝에 Sigmoid 없음)")

    def b():
        expect(isinstance(need(g, "loss_fn"), nn.BCEWithLogitsLoss), "nn.BCEWithLogitsLoss()를 만들어야 해요")

    def c():
        opt, net = need(g, "optimizer"), need(g, "net")
        expect(isinstance(opt, torch.optim.Adam), "torch.optim.Adam이어야 해요")
        expect(abs(opt.param_groups[0]["lr"] - 0.001) < 1e-12, "lr=0.001을 지정하세요")
        given = {id(p) for gr in opt.param_groups for p in gr["params"]}
        expect(given == {id(p) for p in net.parameters()}, "net.parameters()를 넘겨야 해요")

    _run(5, [("a", 8, a), ("b", 4, b), ("c", 4, c)])


def q6(g):
    def a():
        h = need(g, "history")
        expect(isinstance(h, list) and len(h) == 60, f"history에 60개를 기록해야 해요 (현재 {len(h) if isinstance(h, list) else '리스트 아님'})")
        expect(all(isinstance(r, dict) and set(r) == {"epoch", "train_loss", "valid_loss"} for r in h),
               "각 기록은 epoch, train_loss, valid_loss 키를 가진 딕셔너리여야 해요")
        expect([r["epoch"] for r in h] == list(range(1, 61)), "epoch는 1부터 60까지여야 해요")
        expect(all(isinstance(r["train_loss"], float) and isinstance(r["valid_loss"], float) for r in h),
               "손실은 실수(float)로 저장하세요")
        expect(h[-1]["train_loss"] < h[0]["train_loss"], "학습 손실이 줄지 않았어요. 학습 함수를 호출했는지 확인하세요")

    def b():
        hd, ax = need(g, "history_df"), need(g, "ax")
        expect(isinstance(hd, pd.DataFrame) and len(hd) == 60, "60행의 DataFrame이어야 해요")
        lines = {ln.get_label(): ln for ln in ax.lines}
        expect({"train", "valid"} <= set(lines), "label이 train, valid인 선 두 개를 그려야 해요")
        expect(np.allclose(lines["train"].get_xdata(), hd["epoch"]) and np.allclose(lines["train"].get_ydata(), hd["train_loss"]),
               "train 선은 가로축 epoch, 세로축 train_loss여야 해요")
        expect(np.allclose(lines["valid"].get_ydata(), hd["valid_loss"]), "valid 선은 valid_loss를 그려야 해요")

    _run(6, [("a", 12, a), ("b", 6, b)])


def q7(g):
    x = torch.tensor(ps.ready_data()["X_valid"][:6])

    def a():
        fn = need(g, "predict_prob")
        model = ps.make_dropout_model()
        model.train()
        p1, p2 = fn(model, x), fn(model, x)
        expect(isinstance(p1, torch.Tensor) and tuple(p1.shape) == (6,), "모양 (6,)의 텐서를 돌려줘야 해요 (squeeze 또는 view(-1))")
        expect(not model.training, "model.eval()로 평가 모드로 바꾸세요")
        expect(not p1.requires_grad, "torch.no_grad() 안에서 계산하세요")
        expect(torch.equal(p1, p2), "같은 입력이면 결과가 같아야 해요")
        with torch.no_grad():
            ref = torch.sigmoid(model(x)).view(-1)
        expect(torch.allclose(p1, ref, atol=1e-6), "sigmoid로 바꾼 확률이어야 해요")

    def b():
        prob, label = need(g, "sample_prob"), need(g, "sample_label")
        expect(isinstance(label, torch.Tensor) and label.dtype == torch.long, "sample_label은 long 텐서여야 해요 (.long())")
        expect(torch.equal(label, (prob >= 0.5).long()), "0.5 '이상'이면 1이어야 해요")

    _run(7, [("a", 6, a), ("b", 4, b)])


def q8(g):
    actual, probs = ps.load_valid_probs()
    ths = [0.3, 0.5, 0.7]
    ref = {t: recall_score(actual, (probs >= t).astype(int)) for t in ths}
    ok_ths = [t for t in ths if ref[t] >= 0.9]
    ref_best = max(ok_ths) if ok_ths else None

    def a():
        rb = need(g, "recall_by_th")
        expect(isinstance(rb, dict) and sorted(rb) == ths, "키가 0.3, 0.5, 0.7인 딕셔너리여야 해요")
        expect(all(abs(float(rb[t]) - ref[t]) < 1e-9 for t in ths), "기준값 이상을 1로 본 재현율이어야 해요")

    def b():
        expect("chosen_th" in g, "`chosen_th` 변수가 없어요")
        expect(g["chosen_th"] == ref_best, f"재현율 0.9 이상인 기준값 중 가장 큰 값이 아니에요 (기대 {ref_best})")

    _run(8, [("a", 4, a), ("b", 4, b)])
