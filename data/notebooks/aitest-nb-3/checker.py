"""AI 실기 노트북 모의고사 3회 - 자동 확인

노트북의 확인 셀에서 check.qN(globals())로 부릅니다. 이 파일은 고치지 않습니다.
정답 여부만 알려 주며, 실제 시험의 채점 기준과 똑같지는 않습니다.
"""
import numpy as np
import pandas as pd
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

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
        st = need(g, "target_stats")
        ref = dev["target"].agg(["mean", "std", "min", "max"])
        expect(isinstance(st, pd.Series), "pandas Series여야 해요")
        expect(list(st.index) == ["mean", "std", "min", "max"], "인덱스가 mean, std, min, max 순서여야 해요")
        expect(np.allclose(st.values.astype(float), ref.values), "값이 달라요")

    def b():
        tr, va = need(g, "train_df"), need(g, "valid_df")
        expect(isinstance(tr, pd.DataFrame) and isinstance(va, pd.DataFrame), "DataFrame이어야 해요")
        expect(list(tr.columns) == list(dev.columns), "모든 열을 그대로 두어야 해요")
        expect(list(tr.index) == list(ref_train.index) and list(va.index) == list(ref_valid.index),
               "분할 결과가 달라요. test_size, random_state를 확인하고 stratify는 쓰지 마세요")

    def c():
        X, y = np.asarray(need(g, "X_tr")), np.asarray(need(g, "y_tr"))
        expect(X.shape == (len(ref_train), 10), f"X_tr는 ({len(ref_train)}, 10)이어야 해요 (현재 {X.shape})")
        expect(np.allclose(X, ref_train[feats].to_numpy(dtype=float)), "feature_cols의 열만 순서대로 담아야 해요")
        expect(np.allclose(y, ref_train["target"].to_numpy()), "y_tr는 train_df의 target이어야 해요")

    _run(1, [("a", 4, a), ("b", 5, b), ("c", 3, c)])


def q2(g):
    stats = ps.ready_train_table()
    feats = ps.FEATURES

    def a():
        ct = need(g, "corr_target")
        ref = stats[feats].corrwith(stats["target"]).sort_values(ascending=False)
        expect(isinstance(ct, pd.Series), "pandas Series여야 해요")
        expect(list(ct.index) == list(ref.index), "입력 열 10개가 상관계수 큰 순서로 정렬되어야 해요 (target 자신은 빼기)")
        expect(np.allclose(ct.values, ref.values), "상관계수 값이 달라요")

    def b():
        ax = need(g, "ax")
        pts, _ = scatter_points(ax)
        expect(same_points(pts, stats["bmi"], stats["target"]), "가로축 bmi, 세로축 target인 학습용 점을 그려야 해요")

    _run(2, [("a", 5, a), ("b", 5, b)])


def q3(g):
    raw = ps.ready_raw_xy()
    ref = LinearRegression().fit(raw["X_train"], raw["y_train"])
    ref_pred = ref.predict(raw["X_valid"])
    ref_base = np.full(len(raw["y_valid"]), raw["y_train"].mean())

    def a():
        lin = need(g, "lin")
        expect(isinstance(lin, LinearRegression) and hasattr(lin, "coef_"), "LinearRegression을 만들고 fit하세요")
        expect(np.allclose(np.asarray(need(g, "pred_lin")), ref_pred), "검증용 예측이 달라요")

    def b():
        base = np.asarray(need(g, "pred_base"), dtype=float)
        expect(base.shape == ref_base.shape, f"검증용 수({len(ref_base)})만큼의 배열이어야 해요")
        expect(np.allclose(base, ref_base), "모든 값이 학습용 target의 평균이어야 해요")

    def c():
        m1, m2 = float(need(g, "mae_lin")), float(need(g, "mae_base"))
        expect(abs(m1 - mean_absolute_error(raw["y_valid"], ref_pred)) < 1e-6, "mae_lin이 달라요")
        expect(abs(m2 - mean_absolute_error(raw["y_valid"], ref_base)) < 1e-6, "mae_base가 달라요")

    _run(3, [("a", 6, a), ("b", 3, b), ("c", 3, c)])


def q4(g):
    actual, guessed = ps.load_regression_example()

    def a():
        expect(abs(float(need(g, "mae")) - mean_absolute_error(actual, guessed)) < 1e-6, "MAE가 달라요")

    def b():
        ref = np.sqrt(mean_squared_error(actual, guessed))
        expect(abs(float(need(g, "rmse")) - ref) < 1e-6, "RMSE가 달라요 (MSE의 제곱근)")

    def c():
        expect(abs(float(need(g, "r2")) - r2_score(actual, guessed)) < 1e-6, "R²가 달라요. 인자 순서(실제, 예측)를 확인하세요")

    _run(4, [("a", 4, a), ("b", 5, b), ("c", 5, c)])


def q5(g):
    def a():
        ls = layers(need(g, "net"))
        ok = (len(ls) == 5 and linear_is(ls[0], 10, 32) and isinstance(ls[1], nn.ReLU) and linear_is(ls[2], 32, 16)
              and isinstance(ls[3], nn.ReLU) and linear_is(ls[4], 16, 1))
        expect(ok, "Linear(10, 32) → ReLU → Linear(32, 16) → ReLU → Linear(16, 1) 순서여야 해요")

    def b():
        expect(isinstance(need(g, "loss_fn"), nn.MSELoss), "nn.MSELoss()를 만들어야 해요")

    def c():
        opt, net = need(g, "optimizer"), need(g, "net")
        expect(isinstance(opt, torch.optim.Adam), "torch.optim.Adam이어야 해요")
        expect(abs(opt.param_groups[0]["lr"] - 0.01) < 1e-12, "lr=0.01을 지정하세요")
        given = {id(p) for gr in opt.param_groups for p in gr["params"]}
        expect(given == {id(p) for p in net.parameters()}, "net.parameters()를 넘겨야 해요")

    def d():
        yb, col = need(g, "yb"), need(g, "yb_col")
        expect(isinstance(col, torch.Tensor) and tuple(col.shape) == (len(yb), 1), f"yb_col은 ({len(yb)}, 1) 모양이어야 해요")
        expect(col.dtype == torch.float32 and torch.equal(col.view(-1), yb), "yb의 값을 그대로 (B, 1)로 바꿔야 해요")

    _run(5, [("a", 7, a), ("b", 3, b), ("c", 3, c), ("d", 3, d)])


def _reference_history():
    """6번 준비 셀과 같은 조건으로 모범 답안을 실행한 기록"""
    ps.seed_all(3)
    d = ps.ready_data()
    data = TensorDataset(torch.tensor(d["X_train"]), torch.tensor(d["y_train"]).view(-1, 1))
    loader = DataLoader(data, batch_size=32, shuffle=True, generator=torch.Generator().manual_seed(3))
    xv, yv = torch.tensor(d["X_valid"]), torch.tensor(d["y_valid"]).view(-1, 1)
    model = ps.make_practice_model()
    crit = nn.MSELoss()
    opt = torch.optim.Adam(model.parameters(), lr=0.01)
    out = []
    for epoch in range(1, 101):
        model.train()
        total, count = 0.0, 0
        for bx, by in loader:
            opt.zero_grad()
            loss = crit(model(bx), by)
            loss.backward()
            opt.step()
            total += loss.item() * len(by)
            count += len(by)
        model.eval()
        with torch.no_grad():
            va = crit(model(xv), yv).item()
        out.append((total / count, va))
    return out


def q6(g):
    def a():
        h = need(g, "history")
        expect(isinstance(h, list) and len(h) == 100, f"history에 100개를 기록해야 해요 (현재 {len(h) if isinstance(h, list) else '리스트 아님'})")
        expect(all(isinstance(r, dict) and set(r) == {"epoch", "train_loss", "valid_loss"} for r in h),
               "각 기록은 epoch, train_loss, valid_loss 키를 가진 딕셔너리여야 해요")
        expect([r["epoch"] for r in h] == list(range(1, 101)), "epoch는 1부터 100까지여야 해요")
        expect(all(isinstance(r["train_loss"], float) and isinstance(r["valid_loss"], float) for r in h),
               "손실은 실수(float)로 저장하세요 (.item())")
        ref = _reference_history()
        tr_ok = all(abs(r["train_loss"] - t) < 1e-4 * max(1.0, t) for r, (t, _) in zip(h, ref))
        va_ok = all(abs(r["valid_loss"] - v) < 1e-4 * max(1.0, v) for r, (_, v) in zip(h, ref))
        expect(tr_ok, "학습 손실이 모범 답안과 달라요. 배치 순서(zero_grad → 손실 → backward → step)와 "
                      "'손실 × 배치 크기'의 합 / 전체 개수를 확인하고, 준비 셀부터 다시 실행하세요")
        expect(va_ok, "검증 손실이 달라요. 평가 모드와 torch.no_grad()로 epoch마다 학습 뒤에 구하세요")

    def b():
        hd, best = need(g, "history_df"), need(g, "best_epoch")
        expect(isinstance(hd, pd.DataFrame) and len(hd) == 100, "100행의 DataFrame이어야 해요")
        ref = int(hd.loc[hd["valid_loss"].idxmin(), "epoch"])
        expect(int(best) == ref, f"검증 손실이 가장 작은 epoch가 아니에요 (기대 {ref})")

    _run(6, [("a", 12, a), ("b", 6, b)])


def q7(g):
    x = torch.tensor(ps.ready_data()["X_valid"][:5])

    def a():
        ls = layers(need(g, "drop_net"))
        ok = (len(ls) == 4 and linear_is(ls[0], 10, 32) and isinstance(ls[1], nn.ReLU)
              and isinstance(ls[2], nn.Dropout) and linear_is(ls[3], 32, 1))
        expect(ok, "Linear(10, 32) → ReLU → Dropout → Linear(32, 1) 순서여야 해요")
        expect(abs(ls[2].p - 0.1) < 1e-12, "Dropout의 p는 0.1이에요")

    def b():
        fn, net = need(g, "predict_values"), need(g, "drop_net")
        net.train()
        out1, out2 = fn(net, x), fn(net, x)
        expect(isinstance(out1, np.ndarray) and out1.shape == (5,), "모양 (5,)의 NumPy 배열을 돌려줘야 해요")
        expect(not net.training, "model.eval()로 평가 모드로 바꾸세요")
        expect(np.array_equal(out1, out2), "같은 입력이면 결과가 같아야 해요")
        with torch.no_grad():
            ref = net(x).view(-1).numpy() * ps.TARGET_SCALE
        expect(np.allclose(out1, ref, rtol=1e-5, atol=1e-4), "출력에 100을 곱해 원래 단위로 돌려줘야 해요")

    _run(7, [("a", 6, a), ("b", 4, b)])


def q8(g):
    ids, actual, pred = ps.load_valid_predictions()
    err = np.abs(actual - pred)

    def a():
        e = np.asarray(need(g, "abs_err"), dtype=float)
        expect(e.shape == err.shape and np.allclose(e, err), "환자마다 |실제 - 예측|이어야 해요")

    def b():
        top = need(g, "top5_ids")
        expect(isinstance(top, np.ndarray) and top.shape == (5,), "길이 5의 NumPy 배열이어야 해요")
        expect(np.array_equal(top, ids[np.argsort(-err)[:5]]), "오차가 큰 순서대로 5명의 환자 번호여야 해요")

    _run(8, [("a", 4, a), ("b", 4, b)])
