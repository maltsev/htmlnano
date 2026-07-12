#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { spawnSync } = require('node:child_process');
const process = require('node:process');

const RELEASE_TYPES = new Set(['major', 'minor', 'patch']);
const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const OPENAI_MODEL = 'gpt-5.4';
const GITHUB_FALLBACK_REPOSITORY_URL = 'https://github.com/maltsev/htmlnano';
const COMMIT_RECORD_SEPARATOR = '\x1e';
const COMMIT_FIELD_SEPARATOR = '\x1f';

const rootDir = path.resolve(__dirname, '..');
const paths = {
    changelog: path.join(rootDir, 'CHANGELOG.md'),
    docsVersions: path.join(rootDir, 'docs', 'versions.json'),
    packageJson: path.join(rootDir, 'package.json'),
    versionedDocsDir: path.join(rootDir, 'docs', 'versioned_docs'),
    versionedSidebarsDir: path.join(rootDir, 'docs', 'versioned_sidebars')
};

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: options.stdio || 'pipe'
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0 && !options.allowFailure) {
        const output = [result.stdout, result.stderr]
            .filter(Boolean)
            .join('\n')
            .trim();
        const message = output
            ? `Command failed: ${command} ${args.join(' ')}\n${output}`
            : `Command failed: ${command} ${args.join(' ')}`;

        throw new Error(message);
    }

    return result;
}

function assertReleaseType(releaseType) {
    if (!RELEASE_TYPES.has(releaseType)) {
        throw new Error('npm run release -- <major|minor|patch>');
    }
}

function ensureCleanWorktree() {
    const status = run('git', ['status', '--short']).stdout.trim();

    if (status) {
        throw new Error(`Refusing to release from a dirty worktree.\n${status}`);
    }
}

function getLatestTag() {
    const result = run('git', ['tag', '--list', '--sort=-v:refname'], {
        allowFailure: true
    });

    if (result.status !== 0) {
        return null;
    }

    const tags = result.stdout
        .split('\n')
        .map(line => line.trim())
        .filter(tag => /^v?\d+\.\d+\.\d+$/.test(tag));

    return tags[0] || null;
}

function normalizeVersion(tagOrVersion) {
    return tagOrVersion.startsWith('v') ? tagOrVersion.slice(1) : tagOrVersion;
}

function bumpVersion(currentVersion, releaseType) {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(currentVersion);

    if (!match) {
        throw new Error(`Unsupported version format: ${currentVersion}`);
    }

    let [major, minor, patch] = match.slice(1).map(Number);

    switch (releaseType) {
        case 'major':
            major += 1;
            minor = 0;
            patch = 0;
            break;
        case 'minor':
            minor += 1;
            patch = 0;
            break;
        case 'patch':
            patch += 1;
            break;
        default:
            throw new Error(`Unsupported release type: ${releaseType}`);
    }

    return `${major}.${minor}.${patch}`;
}

function ensureVersionConsistency(packageVersion, latestTag) {
    if (!latestTag) {
        return;
    }

    const latestVersion = normalizeVersion(latestTag);

    if (packageVersion !== latestVersion) {
        throw new Error(`package.json version (${packageVersion}) does not match latest tag (${latestTag}).`);
    }
}

function ensureVersionDoesNotExist(newVersion) {
    const tagExists = run('git', ['tag', '-l', newVersion]).stdout.trim();

    if (tagExists) {
        throw new Error(`Tag ${newVersion} already exists.`);
    }

    const versionedDocsDir = path.join(paths.versionedDocsDir, `version-${newVersion}`);
    if (fs.existsSync(versionedDocsDir)) {
        throw new Error(`Docs version directory already exists: ${versionedDocsDir}`);
    }
}

function extractIssueReferences(text) {
    const matches = text.matchAll(/(^|[^\w])#(\d+)\b/g);
    const references = new Set();

    for (const match of matches) {
        references.add(Number(match[2]));
    }

    return Array.from(references).sort((left, right) => right - left);
}

function getCommits(latestTag) {
    const args = ['log', '--reverse', '--no-merges', `--pretty=format:%s${COMMIT_FIELD_SEPARATOR}%b${COMMIT_FIELD_SEPARATOR}%h${COMMIT_RECORD_SEPARATOR}`];

    if (latestTag) {
        args.push(`${latestTag}..HEAD`);
    }

    const output = run('git', args).stdout;

    return output
        .split(COMMIT_RECORD_SEPARATOR)
        .map(record => record.trim())
        .filter(Boolean)
        .map((record) => {
            const [subject = '', body = '', shortHash = ''] = record.split(COMMIT_FIELD_SEPARATOR);
            const details = [subject, body].filter(Boolean).join('\n');

            return {
                body: body.trim(),
                references: extractIssueReferences(details),
                shortHash: shortHash.trim(),
                subject: subject.trim()
            };
        })
        .filter(commit => commit.subject);
}

function formatCommitsForPrompt(commits) {
    return commits.map((commit) => {
        const lines = [`- ${commit.subject} (${commit.shortHash})`];
        if (commit.references.length > 0) {
            lines.push(`  refs: ${commit.references.map(reference => `[#${reference}]`).join(', ')}`);
        }
        if (commit.body) {
            lines.push(`  details: ${commit.body.replace(/\s+/g, ' ').trim()}`);
        }

        return lines.join('\n');
    }).join('\n\n');
}

function getCurrentDate() {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

async function summarizeCommitLog(previousVersion, newVersion, commitLog) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required to generate the changelog entry.');
    }

    if (typeof fetch !== 'function') {
        throw new Error('This script requires a Node.js runtime with global fetch support.');
    }

    const prompt = [
        'You are writing a markdown changelog entry for the htmlnano project.',
        '',
        `Previous version: ${previousVersion || 'none'}`,
        `New version: ${newVersion}`,
        '',
        'Return only the markdown body for the new release entry.',
        'Rules:',
        '- Use only these section headings when needed: "### Added", "### Changed", "### Fixed".',
        '- Omit any empty section.',
        '- Use markdown bullet points with "* ".',
        '- Focus on user-facing changes and notable behavior changes.',
        '- Ignore CI, test-only, refactor-only, and dependency-only changes unless they clearly affect users.',
        '- When a relevant change references an issue or PR from the commit log, include it inline as [#123].',
        '- Keep the wording concise and factual.',
        '- Do not include the release header, date, intro paragraph, code fences, or any explanation outside the changelog body.',
        '',
        'Commit log:',
        commitLog
    ].join('\n');

    const headers = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    };

    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: OPENAI_MODEL,
            input: prompt
        })
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`OpenAI API request failed (${response.status} ${response.statusText}): ${body}`);
    }

    const payload = await response.json();
    const summary = extractOutputText(payload).trim();

    if (!summary) {
        throw new Error('OpenAI API returned an empty changelog summary.');
    }

    return summary;
}

function extractOutputText(payload) {
    if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
        return payload.output_text;
    }

    if (!Array.isArray(payload.output)) {
        return '';
    }

    return payload.output
        .flatMap(item => Array.isArray(item.content) ? item.content : [])
        .map((content) => {
            if (typeof content.text === 'string') {
                return content.text;
            }

            if (typeof content.output_text === 'string') {
                return content.output_text;
            }

            return '';
        })
        .join('\n');
}

function compareSemverDescending(left, right) {
    const leftParts = left.split('.').map(Number);
    const rightParts = right.split('.').map(Number);

    for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
        const leftPart = leftParts[index] || 0;
        const rightPart = rightParts[index] || 0;

        if (leftPart !== rightPart) {
            return rightPart - leftPart;
        }
    }

    return 0;
}

function parseReferenceDefinitions(changelog) {
    const referenceStart = changelog.search(/^\[[^\]]+\]:\s+\S+/m);
    const body = referenceStart === -1 ? changelog.trimEnd() : changelog.slice(0, referenceStart).trimEnd();
    const definitions = referenceStart === -1 ? '' : changelog.slice(referenceStart);
    const compareLinks = new Map();
    const issueLinks = new Map();

    for (const line of definitions.split('\n')) {
        const match = /^\[([^\]]+)\]:\s+(\S+)\s*$/.exec(line);
        if (!match) {
            continue;
        }

        const [, key, url] = match;
        if (/^\d+\.\d+\.\d+$/.test(key)) {
            compareLinks.set(key, url);
            continue;
        }
        if (/^#\d+$/.test(key)) {
            issueLinks.set(key, url);
        }
    }

    return {
        body,
        compareLinks,
        issueLinks
    };
}

function buildReferenceBlock(compareLinks, issueLinks) {
    const compareLines = Array.from(compareLinks.entries())
        .sort(([left], [right]) => compareSemverDescending(left, right))
        .map(([key, url]) => `[${key}]: ${url}`);

    const issueLines = Array.from(issueLinks.entries())
        .sort(([left], [right]) => Number(right.slice(1)) - Number(left.slice(1)))
        .map(([key, url]) => `[${key}]: ${url}`);

    const sections = [];
    if (compareLines.length > 0) {
        sections.push(compareLines.join('\n'));
    }
    if (issueLines.length > 0) {
        sections.push(issueLines.join('\n'));
    }

    return sections.join('\n\n');
}

function updateChangelog(newVersion, previousVersion, summary, repositoryUrl) {
    const current = fs.readFileSync(paths.changelog, 'utf8');
    const header = `## [${newVersion}] - ${getCurrentDate()}`;

    if (current.includes(`## [${newVersion}]`)) {
        throw new Error(`CHANGELOG.md already contains an entry for ${newVersion}.`);
    }

    const { body, compareLinks, issueLinks } = parseReferenceDefinitions(current);
    const entry = [header, '', summary.trim(), ''].join('\n');
    const firstReleaseHeader = body.search(/^## \[/m);
    const nextBody = firstReleaseHeader === -1
        ? `${body}\n\n${entry}`.trimEnd()
        : `${body.slice(0, firstReleaseHeader).trimEnd()}\n\n${entry}\n${body.slice(firstReleaseHeader).trimStart()}`;

    if (previousVersion) {
        compareLinks.set(newVersion, `${repositoryUrl}/compare/${previousVersion}...${newVersion}`);
    }

    for (const reference of extractIssueReferences(summary)) {
        issueLinks.set(`#${reference}`, `${repositoryUrl}/issues/${reference}`);
    }

    const referenceBlock = buildReferenceBlock(compareLinks, issueLinks);
    const nextChangelog = referenceBlock
        ? `${nextBody.trimEnd()}\n\n${referenceBlock}\n`
        : `${nextBody.trimEnd()}\n`;

    fs.writeFileSync(paths.changelog, nextChangelog);
}

function renameVersionedDocs(currentVersion, newVersion) {
    const currentDocsDir = path.join(paths.versionedDocsDir, `version-${currentVersion}`);
    const nextDocsDir = path.join(paths.versionedDocsDir, `version-${newVersion}`);
    const currentSidebarFile = path.join(paths.versionedSidebarsDir, `version-${currentVersion}-sidebars.json`);
    const nextSidebarFile = path.join(paths.versionedSidebarsDir, `version-${newVersion}-sidebars.json`);

    if (!fs.existsSync(currentDocsDir)) {
        throw new Error(`Current versioned docs directory does not exist: ${currentDocsDir}`);
    }
    if (!fs.existsSync(currentSidebarFile)) {
        throw new Error(`Current versioned sidebar file does not exist: ${currentSidebarFile}`);
    }
    if (fs.existsSync(nextDocsDir) || fs.existsSync(nextSidebarFile)) {
        throw new Error(`Versioned docs for ${newVersion} already exist.`);
    }

    fs.renameSync(currentDocsDir, nextDocsDir);
    fs.renameSync(currentSidebarFile, nextSidebarFile);

    const versions = readJson(paths.docsVersions);
    if (!Array.isArray(versions)) {
        throw new TypeError('docs/versions.json must contain an array of version strings.');
    }

    if (!versions.includes(currentVersion)) {
        throw new Error(`docs/versions.json does not contain the current version ${currentVersion}.`);
    }

    writeJson(paths.docsVersions, versions.map(version => version === currentVersion ? newVersion : version));
}

function bumpPackageVersion(releaseType, expectedVersion) {
    run('npm', ['version', releaseType, '--no-git-tag-version'], {
        stdio: 'inherit'
    });

    const updatedVersion = readJson(paths.packageJson).version;
    if (updatedVersion !== expectedVersion) {
        throw new Error(`Version bump produced ${updatedVersion}, expected ${expectedVersion}.`);
    }
}

function createReleaseCommit(newVersion) {
    run('git', ['add', '-A'], {
        stdio: 'inherit'
    });

    run('git', ['commit', '-m', `Release ${newVersion}`], {
        stdio: 'inherit'
    });
}

function createReleaseTag(newVersion) {
    run('git', ['tag', '-a', newVersion, '-m', `Release ${newVersion} version`], {
        stdio: 'inherit'
    });
}

async function confirmProceed(newVersion) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    try {
        const answer = await rl.question(`Proceed with commit, tag, push, and npm publish for ${newVersion}? [y/N] `);

        return /^(y|yes)$/i.test(answer.trim());
    } finally {
        rl.close();
    }
}

async function main() {
    const releaseType = process.argv[2];

    assertReleaseType(releaseType);
    ensureCleanWorktree();

    const packageVersion = readJson(paths.packageJson).version;
    const latestTag = getLatestTag();
    ensureVersionConsistency(packageVersion, latestTag);

    const newVersion = bumpVersion(packageVersion, releaseType);
    ensureVersionDoesNotExist(newVersion);

    const commits = getCommits(latestTag);
    if (commits.length === 0) {
        throw new Error(`No commits found since ${latestTag || 'the beginning of history'}.`);
    }
    const commitLog = formatCommitsForPrompt(commits);

    console.log(`Generating changelog for ${newVersion} from ${latestTag || 'initial history'}..HEAD...`);
    const previousVersion = latestTag ? normalizeVersion(latestTag) : null;
    const summary = await summarizeCommitLog(previousVersion, newVersion, commitLog);

    console.log('Updating CHANGELOG.md...');
    updateChangelog(newVersion, previousVersion, summary, GITHUB_FALLBACK_REPOSITORY_URL);

    console.log(`Renaming versioned docs ${packageVersion} -> ${newVersion}...`);
    renameVersionedDocs(packageVersion, newVersion);

    console.log(`Bumping package version to ${newVersion}...`);
    bumpPackageVersion(releaseType, newVersion);

    const shouldProceed = await confirmProceed(newVersion);
    if (!shouldProceed) {
        console.log('Release files were prepared locally. Skipping commit, tag, push, and npm publish.');
        return;
    }

    console.log(`Creating release commit for ${newVersion}...`);
    createReleaseCommit(newVersion);

    console.log(`Creating git tag ${newVersion}...`);
    createReleaseTag(newVersion);

    console.log('Pushing git commit and tags...');
    run('git', ['push', '--follow-tags'], {
        stdio: 'inherit'
    });

    console.log('Publishing to npm...');
    run('npm', ['publish'], {
        stdio: 'inherit'
    });

    console.log(`Release ${newVersion} completed.`);
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
