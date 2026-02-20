# @elizaos/plugin-xproof

Certify agent outputs on the **MultiversX blockchain** via [xProof](https://xproof.app).

Anchor text, hashes, decisions, and reports with tamper-proof on-chain proof. $0.05/cert, 6-second finality.

## Actions

| Action | Description |
|--------|-------------|
| `CERTIFY_CONTENT` | Certify text/output/decision on-chain |
| `CERTIFY_HASH` | Certify a SHA-256 hash on-chain |
| `CERTIFY_BATCH` | Certify up to 50 items in one call |
| `VERIFY_PROOF` | Check status of a certificate by ID |

## Install

```bash
elizaos install @elizaos/plugin-xproof
```

Or in your `package.json`:

```json
{
  "dependencies": {
    "@elizaos/plugin-xproof": "github:jasonxkensei/plugin-xproof"
  }
}
```

## Configuration

Set `XPROOF_API_KEY` in your `.env`. Get a key at [xproof.app](https://xproof.app).

```env
XPROOF_API_KEY=your_api_key_here
# Optional — defaults to https://xproof.app
XPROOF_BASE_URL=https://xproof.app
```

## Usage in agent character

```json
{
  "name": "MyAgent",
  "plugins": ["@elizaos/plugin-xproof"],
  "settings": {
    "XPROOF_API_KEY": "your_api_key_here"
  }
}
```

## Example interactions

```
User: Certify this report: quarterly audit completed, no anomalies found.
Agent: ✅ Content certified on MultiversX blockchain.

Certificate ID: cert_abc123
Status: pending
Hash: sha256:3f4e...
Verify: https://xproof.app/verify/cert_abc123
Explorer: https://explorer.multiversx.com/transactions/...
Certified at: 2026-02-20T14:00:05Z
```

```
User: Verify certificate cert_abc123
Agent: ✅ Certificate cert_abc123
Status: confirmed
...
```

## Pricing

| Volume | Price |
|--------|-------|
| 0–100K/month | $0.05/cert |
| 100K–1M/month | $0.025/cert |
| 1M+/month | $0.01/cert |

## Links

- [xproof.app](https://xproof.app)
- [API docs](https://xproof.app/llms.txt)
- [ClawHub skill](https://clawhub.ai/jasonxkensei/xproof)
- [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=xproof)
- [MultiversX Explorer](https://explorer.multiversx.com)

## License

MIT
