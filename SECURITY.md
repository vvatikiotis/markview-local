# MarkView Local Security Policy

## Supported versions

MarkView Local changes are maintained on this checkout's `main` branch. No separate release schedule or support for
older versions is promised.

## Reporting a vulnerability

Do not publish vulnerability details in public issues. For a problem specific to MarkView Local, contact the
maintainer of your checkout privately.

For vulnerabilities reproducible in the original MarkView project, use its upstream reporting channels:

- **Preferred:** use [Report a vulnerability](https://github.com/markview-app/markview/security/advisories/new) in
  the original repository's Security tab. Only the maintainers can see the report, and the discussion and fix happen in a
  private security advisory.
- **Without a GitHub account:** email **support@getmarkview.com**.

Include:

- what the problem is and what an attacker could do with it
- the steps or a sample markdown file that reproduce it
- the browser and version, and the MarkView Local commit or release you tested; for upstream reports, include the
  original MarkView revision used to reproduce the issue

Please keep the details private until a fix is available. The upstream channels are not support for local
modifications.

## Scope

In scope for MarkView Local: the code in this repository, the extension it builds, and how it handles documents and the
pages it renders them in.

Out of scope: the version of MarkView distributed through the Chrome Web Store and Edge Add-ons, which is a separate
code base (report its issues through [markview-app/support](https://github.com/markview-app/support)), and
vulnerabilities in the browser itself or in third-party libraries that are not reachable through MarkView Local.

How the extension handles network access, storage and raw HTML is described under "Network" and "Security notes" in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
