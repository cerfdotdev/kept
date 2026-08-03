# Security

- **Reporting**: email hello@kept.dok.cerf.codes (no PGP yet). Never open issues for vulnerabilities.
- **Scope**: the Kept web app, worker, and infrastructure in this repository.
- **Response**: acknowledgment within 48h, fix target within 14 days for high/critical.
- Supply chain: dependencies auto-audited weekly (Dependabot + `pnpm audit` gate in CI); images are built with provenance + SBOM.
