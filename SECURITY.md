# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability within LifePlan, please send an email to the maintainers. All security vulnerabilities will be promptly addressed.

**Please do NOT report security vulnerabilities through public GitHub issues.**

## What to Include

When reporting a vulnerability, please include:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 1 week
- **Fix Released**: Within 30 days for critical issues

## Security Best Practices

When deploying LifePlan:

1. **Environment Variables** — Never commit API keys or secrets to git
2. **Convex Auth** — Use the production Convex deployment, not dev
3. **HTTPS** — Always deploy with HTTPS enabled
4. **Roles** — Assign the minimum necessary role to each user
5. **Payments** — Validate payment amounts server-side before recording
6. **Receipts** — Use receipt status tracking to prevent fraud

## Known Security Considerations

- Email OTP codes expire after 15 minutes
- Anonymous sessions have limited access
- All mutations validate input with Convex validators
- Role-based access is enforced on the backend

## Updates

This security policy is maintained as part of the open source project. If you have suggestions for improving security practices, please open a discussion.
