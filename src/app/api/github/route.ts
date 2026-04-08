import { type NextRequest } from "next/server";

export const runtime = "nodejs";

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

export async function GET(request: NextRequest) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return Response.json({ error: "GITHUB_TOKEN not configured" }, { status: 500 });
  }

  const rawYear = request.nextUrl.searchParams.get("year") ?? new Date().getFullYear().toString();
  const parsedYear = Number(rawYear);
  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(parsedYear) || parsedYear < 2008 || parsedYear > currentYear) {
    return Response.json({ error: `Invalid year: must be 2008–${currentYear}` }, { status: 400 });
  }
  const year = parsedYear;
  const from = `${year}-01-01T00:00:00Z`;
  const to = `${year}-12-31T23:59:59Z`;

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
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: `GitHub API error: ${res.status}`, details: text }, { status: 502 });
    }

    const json = await res.json();
    if (json.errors) {
      return Response.json({ error: "GraphQL errors", details: json.errors }, { status: 502 });
    }

    const calendar = json.data.user.contributionsCollection.contributionCalendar;
    const days: { date: string; count: number }[] = [];
    let activeDays = 0;

    for (const week of calendar.weeks) {
      for (const day of week.contributionDays) {
        days.push({ date: day.date.replace(/-/g, ""), count: day.contributionCount });
        if (day.contributionCount > 0) activeDays++;
      }
    }

    return Response.json({
      data: days,
      meta: {
        totalContributions: calendar.totalContributions,
        activeDays,
        year,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
