import { Octokit } from "@octokit/core";
import { RequestError } from "@octokit/request-error";
import { cacheLife } from "next/cache";
import { db } from "@/lib/db";

// GitHub's contribution calendar is only in the GraphQL API, and only for a
// signed-in user, so this uses the OAuth token stored at login (read:user).
const QUERY = /* GraphQL */ `
  query {
    viewer {
      login
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              weekday
              contributionCount
              contributionLevel
            }
          }
        }
        commitContributionsByRepository(maxRepositories: 6) {
          repository {
            nameWithOwner
            url
            isPrivate
            owner {
              avatarUrl
            }
          }
          contributions {
            totalCount
          }
        }
      }
    }
  }
`;

export type ContributionLevel =
  | "NONE"
  | "FIRST_QUARTILE"
  | "SECOND_QUARTILE"
  | "THIRD_QUARTILE"
  | "FOURTH_QUARTILE";

type ContributionDay = {
  date: string; // YYYY-MM-DD
  weekday: number; // 0 = Sunday
  contributionCount: number;
  contributionLevel: ContributionLevel;
};

type QueryResult = {
  viewer: {
    login: string;
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: number;
        weeks: { contributionDays: ContributionDay[] }[];
      };
      commitContributionsByRepository: {
        repository: {
          nameWithOwner: string;
          url: string;
          isPrivate: boolean;
          owner: { avatarUrl: string };
        };
        contributions: { totalCount: number };
      }[];
    };
  };
};

export type Contributions =
  | {
      ok: true;
      login: string;
      total: number;
      weeks: ContributionDay[][];
      topRepos: { name: string; url: string; isPrivate: boolean; avatarUrl: string; commits: number }[];
    }
  | { ok: false; reason: "no-token" | "token-expired" | "github-error" };

// The past year of contributions for a Shiplog user. Cached per user for an
// hour; a failure is only cached briefly so it retries soon.
export async function getContributions(userId: string): Promise<Contributions> {
  "use cache";

  const account = await db.account.findFirst({
    where: { userId, provider: "github" },
    select: { access_token: true },
  });
  if (!account?.access_token) {
    cacheLife("seconds");
    return { ok: false, reason: "no-token" };
  }

  try {
    const { viewer } = await new Octokit({ auth: account.access_token }).graphql<QueryResult>(QUERY);
    const { contributionCalendar, commitContributionsByRepository } = viewer.contributionsCollection;
    cacheLife("hours");
    return {
      ok: true,
      login: viewer.login,
      total: contributionCalendar.totalContributions,
      weeks: contributionCalendar.weeks.map((week) => week.contributionDays),
      topRepos: commitContributionsByRepository.map(({ repository, contributions }) => ({
        name: repository.nameWithOwner,
        url: repository.url,
        isPrivate: repository.isPrivate,
        avatarUrl: repository.owner.avatarUrl,
        commits: contributions.totalCount,
      })),
    };
  } catch (error) {
    cacheLife("seconds");
    if (error instanceof RequestError && error.status === 401) {
      return { ok: false, reason: "token-expired" };
    }
    console.error("GitHub contributions query failed:", error);
    return { ok: false, reason: "github-error" };
  }
}
