# Security policy

## Reporting a vulnerability

Please report security issues privately by e-mail to the address in
[`/.well-known/security.txt`](https://hy-central-europe-analysis.org/.well-known/security.txt). Do not open a public issue.
Reports in Chinese or English are welcome.

Please include:
- the affected URL or file and the steps to reproduce;
- the impact you observed;
- whether personal data may be involved.

## Scope

- The static website (GitHub Pages) and the downloadable research files.
- The build and validation scripts in this repository.

Out of scope:
- GitHub's own infrastructure. Report those issues to GitHub.
- Third-party data portals.
- Volumetric denial-of-service testing.
- Social engineering.

## Our commitments

- We acknowledge reports as soon as practicable and keep you informed of progress.
- We fix confirmed issues and credit reporters who want credit.
- We do not take action against good-faith research that respects this scope, avoids privacy violations and service
  disruption, and gives us reasonable time to fix before disclosure.

## Design notes

- The site is a static export with no server-side code, accounts, forms, cookies, analytics or third-party runtime scripts.
- The Research Notebook stores data only in the visitor's browser `localStorage`.
