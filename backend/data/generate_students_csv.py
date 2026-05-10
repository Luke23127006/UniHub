"""
Generate a test CSV file for the CSV student sync worker.

Output: data/students_test.csv
Columns: MSSV | Họ và Tên | Email

Features:
  - 10,500 rows by default (configurable via --rows)
  - ~3% intentional duplicate MSSVs to validate upsert logic
  - ~2% rows with blank MSSV to validate skip/error handling
  - Realistic Vietnamese name pool
  - Deterministic output when --seed is provided

Usage:
  python data/generate_students_csv.py
  python data/generate_students_csv.py --rows 20000
  python data/generate_students_csv.py --rows 500 --seed 42 --out data/small_test.csv
"""

import argparse
import csv
import os
import random
import time

# ── Name pools ────────────────────────────────────────────────────────────────

HO = [
    "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ",
    "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đinh", "Tô", "Trịnh",
]

TEN_DEM = [
    "Thị", "Văn", "Thành", "Hữu", "Minh", "Quốc", "Đức", "Anh", "Tuấn",
    "Khánh", "Bảo", "Ngọc", "Kim", "Thu", "Xuân", "Hải", "Phúc", "Gia",
    "Trung", "Long", "Hoàng", "Quang", "Đình", "Công", "Thanh", "", "",
]

TEN = [
    "An", "Bình", "Chi", "Dũng", "Em", "Giang", "Hà", "Hùng", "Khoa", "Lan",
    "Linh", "Mai", "Nam", "Nhung", "Oanh", "Phong", "Quân", "Ry", "Sơn",
    "Tâm", "Thảo", "Uyên", "Việt", "Xuân", "Yến", "Hạnh", "Loan", "Trang",
    "Duyên", "Hiếu", "Lộc", "Nhật", "Phương", "Toàn", "Trung", "Tú", "Vân",
]

FACULTIES = [
    "Công nghệ thông tin", "Kinh tế", "Kỹ thuật điện", "Cơ khí",
    "Xây dựng", "Quản trị kinh doanh", "Luật", "Y khoa", "Dược", "Ngoại ngữ",
]


def random_name(rng: random.Random) -> str:
    ho = rng.choice(HO)
    dem = rng.choice(TEN_DEM)
    ten = rng.choice(TEN)
    parts = [ho, dem, ten] if dem else [ho, ten]
    return " ".join(parts)


def random_email(name: str, mssv: str, rng: random.Random) -> str:
    # Transliterate a few common Vietnamese chars for a plausible email
    clean = (
        name.lower()
        .replace("đ", "d")
        .replace("ă", "a").replace("â", "a").replace("á", "a")
        .replace("à", "a").replace("ả", "a").replace("ã", "a").replace("ạ", "a")
        .replace("ắ", "a").replace("ặ", "a").replace("ấ", "a").replace("ầ", "a")
        .replace("ả", "a").replace("ã", "a")
        .replace("ê", "e").replace("é", "e").replace("è", "e").replace("ẹ", "e")
        .replace("ế", "e").replace("ề", "e")
        .replace("ô", "o").replace("ơ", "o").replace("ó", "o").replace("ò", "o")
        .replace("ổ", "o").replace("ộ", "o").replace("ố", "o").replace("ồ", "o")
        .replace("ú", "u").replace("ù", "u").replace("ụ", "u").replace("ư", "u")
        .replace("ứ", "u").replace("ừ", "u")
        .replace("ý", "y").replace("ỳ", "y").replace("ị", "i").replace("í", "i")
        .replace(" ", ".")
    )
    domains = ["student.edu.vn", "hcmus.edu.vn", "uit.edu.vn"]
    return f"{clean}.{mssv[-4:]}@{rng.choice(domains)}"


# ── Generator ─────────────────────────────────────────────────────────────────

def generate(rows: int, seed: int | None, out_path: str) -> None:
    rng = random.Random(seed)
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)

    duplicate_every = 33          # ~3% duplicates  (1 in 33)
    blank_mssv_every = 50         # ~2% blank MSSV  (1 in 50)
    start_year = 2019

    generated_mssv: list[str] = []
    total_blank = 0
    total_duplicate = 0

    t0 = time.perf_counter()

    with open(out_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["MSSV", "Họ và Tên", "Email"])

        for i in range(1, rows + 1):
            # ~2% blank MSSV rows (skip-error scenario)
            if i % blank_mssv_every == 0:
                writer.writerow(["", random_name(rng), "no_mssv@test.com"])
                total_blank += 1
                continue

            # ~3% duplicate MSSV rows (upsert scenario)
            if generated_mssv and i % duplicate_every == 0:
                mssv = rng.choice(generated_mssv[-200:])  # pick a recent one
                total_duplicate += 1
            else:
                year = rng.randint(start_year, 2024)
                seq = rng.randint(100_000, 999_999)
                mssv = f"{year}{seq}"
                generated_mssv.append(mssv)

            name = random_name(rng)
            email = random_email(name, mssv, rng)
            writer.writerow([mssv, name, email])

    elapsed = time.perf_counter() - t0
    total_written = rows
    total_unique = total_written - total_blank - total_duplicate

    print(f"Generated: {out_path}")
    print(f"  Total rows  : {total_written:,}  (+ 1 header)")
    print(f"  Unique MSSV : {total_unique:,}")
    print(f"  Duplicates  : {total_duplicate:,}  (~{total_duplicate/total_written*100:.1f}%)")
    print(f"  Blank MSSV  : {total_blank:,}  (~{total_blank/total_written*100:.1f}%)")
    print(f"  Time        : {elapsed:.3f}s")
    print(f"  File size   : {os.path.getsize(out_path) / 1024:.1f} KB")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Generate student CSV test data")
    parser.add_argument("--rows", type=int, default=10_500,
                        help="Number of data rows (default: 10500)")
    parser.add_argument("--seed", type=int, default=None,
                        help="Random seed for reproducible output")
    parser.add_argument("--out", type=str, default="data/students_test.csv",
                        help="Output file path (default: data/students_test.csv)")
    args = parser.parse_args()

    if args.rows < 1:
        parser.error("--rows must be >= 1")

    generate(rows=args.rows, seed=args.seed, out_path=args.out)


if __name__ == "__main__":
    main()
