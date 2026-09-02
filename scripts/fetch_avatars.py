#!/usr/bin/env python3
"""
Fetch Codeforces + LeetCode profile avatars and save them locally
so a GitHub Action can commit them into the repo on a schedule.

Codeforces: uses the official public API (stable).
LeetCode:   uses the unofficial GraphQL endpoint (can break if LeetCode
            changes their schema — that's the tradeoff of "no official API").
"""

import os
import sys
import json
import urllib.request

CF_HANDLE = "Habib101"
LC_USERNAME = "habibprogrammerbd"

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(ASSETS_DIR, exist_ok=True)


DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
}


def fetch(url, data=None, headers=None):
    merged_headers = {**DEFAULT_HEADERS, **(headers or {})}
    req = urllib.request.Request(url, data=data, headers=merged_headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read()


def save_image(url, filename):
    img_bytes = fetch(url)
    path = os.path.join(ASSETS_DIR, filename)
    with open(path, "wb") as f:
        f.write(img_bytes)
    print(f"Saved {filename} from {url}")


def update_codeforces_avatar():
    api_url = f"https://codeforces.com/api/user.info?handles={CF_HANDLE}"
    raw = fetch(api_url)
    data = json.loads(raw)
    if data.get("status") != "OK":
        print("Codeforces API error:", data)
        return False
    result = data["result"][0]
    avatar_url = result["titlePhoto"]
    if avatar_url.startswith("//"):
        avatar_url = "https:" + avatar_url
    save_image(avatar_url, "cf_avatar.png")
    return result


def get_cf_solved_count():
    """Count unique solved problems from the submissions history.

    IMPORTANT: Codeforces' user.status API silently limits results if
    'count' isn't specified, so we must pass a large explicit count to
    get the full submission history.
    """
    status_url = (
        f"https://codeforces.com/api/user.status"
        f"?handle={CF_HANDLE}&from=1&count=100000"
    )
    raw = fetch(status_url)
    data = json.loads(raw)
    if data.get("status") != "OK":
        print("Codeforces status API error:", data)
        return 0
    solved = set()
    for sub in data["result"]:
        if sub.get("verdict") == "OK":
            problem = sub["problem"]
            key = (
                problem.get("contestId"),
                problem.get("problemsetName"),
                problem.get("index"),
            )
            solved.add(key)
    print(f"Total submissions fetched: {len(data['result'])}, unique solved: {len(solved)}")
    return len(solved)


RANK_COLORS = {
    "newbie": "#CCCCCC",
    "pupil": "#77FF77",
    "specialist": "#77DDBB",
    "expert": "#AAAAFF",
    "candidate master": "#FF88FF",
    "master": "#FFCC88",
    "international master": "#FFBB55",
    "grandmaster": "#FF7777",
    "international grandmaster": "#FF3333",
    "legendary grandmaster": "#AA0000",
}


def build_cf_card(cf_result, solved_count):
    handle = cf_result.get("handle", CF_HANDLE)
    rating = cf_result.get("rating", "Unrated")
    max_rating = cf_result.get("maxRating", "-")
    rank = cf_result.get("rank", "unrated")
    rank_color = RANK_COLORS.get(rank.lower(), "#7AA2F7")

    svg = f'''<svg width="330" height="200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .bg {{ fill: #1a1b27; }}
      .title {{ font: 700 18px 'Segoe UI', sans-serif; fill: #ffffff; }}
      .label {{ font: 400 13px 'Segoe UI', sans-serif; fill: #9aa5ce; }}
      .value {{ font: 700 22px 'Segoe UI', sans-serif; fill: #ffffff; }}
      .rank {{ font: 700 15px 'Segoe UI', sans-serif; fill: {rank_color}; }}
    </style>
  </defs>
  <rect class="bg" width="330" height="200" rx="12"/>
  <text x="20" y="34" class="title">{handle}</text>
  <text x="20" y="54" class="rank">{rank}</text>

  <text x="20" y="100" class="label">Rating</text>
  <text x="20" y="128" class="value">{rating}</text>

  <text x="120" y="100" class="label">Max Rating</text>
  <text x="120" y="128" class="value">{max_rating}</text>

  <text x="230" y="100" class="label">Solved</text>
  <text x="230" y="128" class="value">{solved_count}</text>

  <rect x="20" y="150" width="290" height="6" rx="3" fill="#2a2b3c"/>
  <rect x="20" y="150" width="{min(290, int(rating or 0) / 10)}" height="6" rx="3" fill="{rank_color}"/>
  <text x="20" y="180" class="label">codeforces.com/profile/{handle}</text>
</svg>'''

    path = os.path.join(ASSETS_DIR, "cf_card.svg")
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)
    print("Saved cf_card.svg")


def update_leetcode_avatar():
    query = {
        "query": """
        query userPublicProfile($username: String!) {
          matchedUser(username: $username) {
            profile {
              userAvatar
            }
          }
        }
        """,
        "variables": {"username": LC_USERNAME},
    }
    headers = {
        "Content-Type": "application/json",
        "Referer": f"https://leetcode.com/{LC_USERNAME}/",
    }
    raw = fetch(
        "https://leetcode.com/graphql",
        data=json.dumps(query).encode("utf-8"),
        headers=headers,
    )
    data = json.loads(raw)
    avatar_url = data["data"]["matchedUser"]["profile"]["userAvatar"]
    save_image(avatar_url, "lc_avatar.png")
    return True


if __name__ == "__main__":
    ok = True
    try:
        cf_result = update_codeforces_avatar()
        if cf_result:
            solved = get_cf_solved_count()
            build_cf_card(cf_result, solved)
    except Exception as e:
        print("Codeforces fetch failed:", e)
        ok = False

    try:
        update_leetcode_avatar()
    except Exception as e:
        print("LeetCode fetch failed:", e)
        ok = False

    sys.exit(0 if ok else 1)
