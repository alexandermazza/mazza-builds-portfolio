import "server-only";

const GITHUB_USERNAME = "alexandermazza";

const QUERY = `
  query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

export interface GitHubResponse {
  data: Array<{ date: string; count: number }>;
  meta: {
    totalContributions: number;
    activeDays: number;
    year: number;
  };
}

export async function loadGitHubData(year?: number): Promise<GitHubResponse | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;

  const targetYear = year ?? new Date().getFullYear();
  const from = `${targetYear}-01-01T00:00:00Z`;
  const to = `${targetYear}-12-31T23:59:59Z`;

  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { login: GITHUB_USERNAME, from, to },
      }),
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;

    const json = await res.json();
    if (json.errors) return null;

    const calendar = json.data.user.contributionsCollection.contributionCalendar;
    const days: { date: string; count: number }[] = [];
    let activeDays = 0;

    for (const week of calendar.weeks) {
      for (const day of week.contributionDays) {
        days.push({ date: day.date.replace(/-/g, ""), count: day.contributionCount });
        if (day.contributionCount > 0) activeDays++;
      }
    }

    return {
      data: days,
      meta: {
        totalContributions: calendar.totalContributions,
        activeDays,
        year: targetYear,
      },
    };
  } catch {
    return null;
  }
}
