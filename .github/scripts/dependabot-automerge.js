/* eslint-disable camelcase -- the GitHub REST API takes snake_case parameters */
'use strict';

const MERGE_METHOD = 'merge';
const SETTLE_ATTEMPTS = 5;
const SETTLE_DELAY_MS = 5000;
const DEPENDABOT_LOGINS = new Set(['dependabot[bot]', 'dependabot']);

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Merges the Dependabot pull requests attached to the finished CI workflow run.
 *
 * Called by `actions/github-script`, which injects its own `github` (Octokit),
 * `context` and `core` helpers.
 *
 * @param {object} params
 * @param {object} params.github - authenticated Octokit client
 * @param {object} params.context - workflow run context, incl. the `workflow_run` payload
 * @param {object} params.core - actions toolkit core, used for logging
 * @returns {Promise<void>}
 */
module.exports = async function dependabotAutomerge({ github, context, core }) {
    const { owner, repo } = context.repo;
    const run = context.payload.workflow_run;

    // GitHub computes mergeability asynchronously, so `mergeable_state` is often
    // "unknown" right after CI completes, and "unstable" until the sibling CI run
    // (`push` vs `pull_request`) reports back. Both settle within a few seconds.
    async function getPullRequest(pullNumber) {
        let pr;

        for (let attempt = 1; attempt <= SETTLE_ATTEMPTS; attempt++) {
            ({ data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: pullNumber }));
            if (pr.merged || pr.state !== 'open') {
                return pr;
            }

            const settled = pr.mergeable !== null
                && pr.mergeable_state !== 'unknown'
                && pr.mergeable_state !== 'unstable';
            if (settled) {
                return pr;
            }

            core.info(`PR #${pullNumber} has not settled yet (state: ${pr.mergeable_state}), retrying (${attempt}/${SETTLE_ATTEMPTS})...`);
            await delay(SETTLE_DELAY_MS);
        }

        return pr;
    }

    async function findPullRequests() {
        if (run.pull_requests && run.pull_requests.length > 0) {
            return run.pull_requests.map(pr => pr.number);
        }

        // `pull_requests` is empty for some workflow_run payloads, fall back to the branch.
        const { data: prs } = await github.rest.pulls.list({
            owner,
            repo,
            state: 'open',
            head: `${owner}:${run.head_branch}`
        });
        return prs.map(pr => pr.number);
    }

    async function mergePullRequest(pullNumber) {
        const pr = await getPullRequest(pullNumber);

        const author = pr.user?.login || '';
        if (!DEPENDABOT_LOGINS.has(author)) {
            core.info(`PR #${pullNumber} is not from Dependabot (${author}).`);
            return;
        }

        if (pr.merged || pr.state !== 'open') {
            core.info(`PR #${pullNumber} is already ${pr.merged ? 'merged' : pr.state}.`);
            return;
        }

        if (pr.mergeable_state !== 'clean') {
            // "unstable" means other checks are still pending: the automerge run
            // triggered by the last finishing CI workflow will pick it up.
            core.info(`PR #${pullNumber} is not mergeable yet (state: ${pr.mergeable_state}).`);
            return;
        }

        try {
            await github.rest.pulls.merge({
                owner,
                repo,
                pull_number: pullNumber,
                merge_method: MERGE_METHOD,
                // Refuse to merge if Dependabot force-pushed after CI passed.
                sha: run.head_sha
            });

            core.info(`Merged Dependabot PR #${pullNumber}.`);
        } catch (error) {
            // 405: not mergeable, 409: head moved since CI ran.
            if (error.status === 405 || error.status === 409) {
                core.info(`PR #${pullNumber} could not be merged: ${error.message}`);
                return;
            }

            throw error;
        }
    }

    const pullNumbers = await findPullRequests();
    if (pullNumbers.length === 0) {
        core.info('No pull requests associated with this workflow_run.');
        return;
    }

    for (const pullNumber of pullNumbers) {
        await mergePullRequest(pullNumber);
    }
};
