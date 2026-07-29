# Security policy

## Reporting a vulnerability

Do not open a public issue containing credentials, exploit details, private prompts, database exports, or logs with sensitive data.

Report security concerns privately through GitHub's **Report a vulnerability** feature for `Jethin10/Jet-Router`. Include:

- The affected version or commit.
- The deployment model and relevant configuration.
- Reproduction steps with secrets removed.
- The expected and observed impact.
- Any suggested mitigation.

If private vulnerability reporting is unavailable, open a minimal issue asking the maintainer for a private contact channel. Do not include the vulnerability details in that issue.

## Supported versions

Security fixes are provided for the latest released version. Deployments built from arbitrary commits are not considered supported releases.

## Credential exposure

If a provider key, OAuth secret, endpoint key, session secret, database, or `.env` file is exposed:

1. Revoke or rotate it at the provider immediately.
2. Remove it from current files and Git history.
3. Review access and request logs for misuse.
4. Rotate related Jet Router endpoint and dashboard secrets.

Deleting a secret only from the latest commit is not sufficient when it exists in repository history.
