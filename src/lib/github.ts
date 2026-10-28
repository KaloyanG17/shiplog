import { App } from "@octokit/app";
import { Octokit } from "@octokit/core";
import { paginateRest } from "@octokit/plugin-paginate-rest";

const OctokitWithPagination = Octokit.plugin(paginateRest);

let app: App<{ Octokit: typeof OctokitWithPagination }> | undefined;

// The GitHub App (not the OAuth app used for login). It reads repos on the
// user's behalf through installation tokens.
export function getGithubApp() {
  if (!app) {
    const appId = process.env.GITHUB_APP_ID;
    // .env files can't hold real newlines, so the PEM is stored with "\n".
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!appId || !privateKey) {
      throw new Error("GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY must be set in .env");
    }
    app = new App({ appId, privateKey, Octokit: OctokitWithPagination });
  }
  return app;
}

export function getInstallUrl() {
  const slug = process.env.GITHUB_APP_SLUG;
  if (!slug) throw new Error("GITHUB_APP_SLUG must be set in .env");
  return `https://github.com/apps/${slug}/installations/new`;
}

export function getManageInstallationUrl(githubInstallId: bigint) {
  return `https://github.com/settings/installations/${githubInstallId}`;
}
