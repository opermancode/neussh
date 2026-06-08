# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| &lt; 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in NeuSSH, please report it responsibly:

1. **Do NOT** open a public issue
2. Email us at **security@neussh.dev** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

3. We will respond within **48 hours** and work on a fix
4. After the fix is released, we will publicly disclose the issue (with your permission)

## Security Features

- AES-256 encrypted profile storage
- Context isolation between main and renderer processes
- No network requests for telemetry or analytics
- Keys never transmitted over network
- Regular dependency updates via Dependabot

## Security Best Practices for Users

1. **Keep NeuSSH updated** to the latest version
2. **Use SSH keys** instead of passwords when possible
3. **Protect your key files** with strong passphrases
4. **Enable 2FA** on your SSH servers
5. **Regularly export** your profiles as backup
