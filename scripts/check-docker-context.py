"""Docker 없이 .dockerignore 판정을 흉내 내 COPY 대상이 컨텍스트에 남는지 본다.

docker 규칙: 패턴을 위에서 아래로 적용하고 «마지막에 일치한 규칙»이 이긴다.
`!` 로 시작하면 제외를 취소(포함)한다.
"""
import fnmatch
import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parent.parent
rules = []
for line in (root / ".dockerignore").read_text().splitlines():
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    neg = line.startswith("!")
    rules.append((neg, line[1:] if neg else line))


def excluded(path: str) -> bool:
    verdict = False
    for neg, pat in rules:
        if fnmatch.fnmatch(path, pat) or fnmatch.fnmatch(pathlib.PurePath(path).name, pat):
            verdict = not neg
    return verdict


# Dockerfile 이 COPY 하는 대상들
targets = []
for line in (root / "Dockerfile").read_text().splitlines():
    m = re.match(r"\s*COPY\s+(?!--from)(.+?)\s+\S+\s*$", line)
    if m:
        for src in m.group(1).split():
            targets.append(src)

print("Dockerfile 이 빌드 컨텍스트에서 COPY 하는 것:")
fail = 0
for t in targets:
    # 글롭이면 실제 매치되는 파일로 편다
    matches = sorted(p.relative_to(root).as_posix() for p in root.glob(t)) if any(c in t for c in "*?[") \
        else [t.rstrip("/")]
    if not matches:
        print(f"  ! {t} — 로컬에 파일이 없음")
        fail += 1
        continue
    for m2 in matches:
        exists = (root / m2).exists()
        ex = excluded(m2)
        mark = "제외됨(빌드 실패)" if ex else "포함됨"
        if not exists:
            mark = "로컬에 없음"
        print(f"  {'FAIL' if (ex or not exists) else 'OK  '} {m2:<24} → {mark}")
        if ex or not exists:
            fail += 1

print()
print("판정:", "FAIL — 이대로 빌드하면 COPY 가 실패한다" if fail else "PASS — COPY 대상이 모두 컨텍스트에 남는다")
sys.exit(1 if fail else 0)
