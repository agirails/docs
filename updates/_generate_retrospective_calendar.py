#!/usr/bin/env python3
"""
Generate a GitHub-style calendar heatmap PNG from the docs/updates posts.

Auto-detects post dates from filenames (YYYY-MM-DD-*.md), renders a
9-week grid covering Feb 15 → Apr 18 2026 (the backfill window), and
saves to retrospective-calendar.png in the same directory.

Run:
    pip install matplotlib
    python _generate_retrospective_calendar.py
"""

import datetime as dt
import re
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.colors import LinearSegmentedColormap

HERE = Path(__file__).parent
START = dt.date(2026, 2, 15)
END = dt.date(2026, 4, 18)

# AGIRAILS brand colors — adjust if you have official ones.
BRAND_BG = '#0d1117'
BRAND_FG = '#e6edf3'
BRAND_GRID = '#21262d'
BRAND_ACCENT = '#3fb950'  # green like GitHub contribution graph


def extract_dates() -> list[dt.date]:
    """Pull post dates from filenames matching YYYY-MM-DD-*.md."""
    pattern = re.compile(r'^(\d{4})-(\d{2})-(\d{2})-.*\.md$')
    dates = []
    for path in sorted(HERE.glob('*.md')):
        m = pattern.match(path.name)
        if not m:
            continue
        d = dt.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        if START <= d <= END:
            dates.append(d)
    return dates


def build_grid(post_dates: list[dt.date]) -> tuple[list[list[int]], list[dt.date]]:
    """
    Build a 7-row × N-week grid (rows = weekday Mon..Sun).
    Each cell is the # of posts on that day.
    Returns the grid and the list of week-start dates for x-axis labels.
    """
    # Snap START back to the previous Monday so columns align cleanly.
    grid_start = START - dt.timedelta(days=START.weekday())
    grid_end = END + dt.timedelta(days=(6 - END.weekday()))
    n_weeks = ((grid_end - grid_start).days + 1) // 7

    # 7 rows (Mon-Sun), n_weeks columns
    grid = [[0] * n_weeks for _ in range(7)]
    week_starts = [grid_start + dt.timedelta(weeks=w) for w in range(n_weeks)]
    for d in post_dates:
        col = (d - grid_start).days // 7
        row = d.weekday()
        grid[row][col] += 1
    return grid, week_starts


def render(grid: list[list[int]], week_starts: list[dt.date], total_posts: int) -> Path:
    """Render the heatmap and save to PNG."""
    n_weeks = len(week_starts)
    fig, ax = plt.subplots(figsize=(max(8, n_weeks * 0.6), 4.5),
                           facecolor=BRAND_BG)
    ax.set_facecolor(BRAND_BG)

    cmap = LinearSegmentedColormap.from_list(
        'agirails', [BRAND_GRID, BRAND_ACCENT], N=4
    )
    max_per_day = max((max(row) for row in grid), default=1) or 1

    for row in range(7):
        for col in range(n_weeks):
            cell_date = week_starts[col] + dt.timedelta(days=row)
            if cell_date < START or cell_date > END:
                # Outside the window — render very faintly so they don't pop
                color = '#0d1117'
            else:
                count = grid[row][col]
                color = cmap(count / max_per_day) if count else BRAND_GRID
            ax.add_patch(mpatches.Rectangle(
                (col, 6 - row), 0.85, 0.85,
                facecolor=color, edgecolor=BRAND_BG, linewidth=2,
            ))

    # Day-of-week labels (Mon, Wed, Fri visible — like GitHub)
    for row, label in enumerate(['Mon', '', 'Wed', '', 'Fri', '', '']):
        if label:
            ax.text(-0.5, 6 - row + 0.4, label,
                    color=BRAND_FG, fontsize=9, ha='right', va='center',
                    family='monospace')

    # Month labels along the bottom — show first column where month appears,
    # also force-show the very first column even mid-month so Feb is visible.
    month_seen = set()
    for col, ws in enumerate(week_starts):
        # First column of the chart always gets a label.
        is_first = col == 0
        is_month_start = ws.day <= 7
        if is_first or (ws.month not in month_seen and is_month_start):
            # For the first column in a month-mid view, label by the month
            # of the START date (Feb 15 → "Feb"), not the Monday-snapped week.
            label_date = START if is_first else ws
            ax.text(col, -0.7, label_date.strftime('%b'),
                    color=BRAND_FG, fontsize=10, ha='left', va='top',
                    family='monospace')
            month_seen.add(label_date.month)

    # Title + subtitle
    ax.text(0, 8.4, 'AGIRAILS — release notes',
            color=BRAND_FG, fontsize=16, fontweight='bold',
            family='monospace', ha='left')
    ax.text(0, 7.7,
            f'{total_posts} posts · Feb 15 → Apr 18, 2026',
            color=BRAND_FG, fontsize=11,
            family='monospace', ha='left', alpha=0.7)

    ax.set_xlim(-2, n_weeks + 0.5)
    ax.set_ylim(-1.5, 9.5)
    ax.set_aspect('equal')
    ax.axis('off')

    # Underscore prefix → Docusaurus blog indexer skips it.
    out = HERE / '_retrospective-calendar.png'
    plt.savefig(out, bbox_inches='tight', facecolor=BRAND_BG, dpi=200)
    plt.close()
    return out


def main():
    dates = extract_dates()
    grid, week_starts = build_grid(dates)
    out = render(grid, week_starts, len(dates))
    print(f'✓ Wrote {out}')
    print(f'  Posts in window: {len(dates)}')
    print(f'  Date range: {START.isoformat()} → {END.isoformat()}')
    if dates:
        first, last = dates[0], dates[-1]
        gap_days = (last - first).days
        print(f'  Spans {gap_days} days, avg {gap_days / max(len(dates) - 1, 1):.1f} days between posts')


if __name__ == '__main__':
    main()
