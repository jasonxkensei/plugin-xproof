import type { Plugin, Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';

// ─── Types ────────────────────────────────────────────────────────────────────

interface XProofConfig {
  apiKey: string;
  baseUrl: string;
}

interface CertifyResult {
  id: string;
  status: 'pending' | 'confirmed' | 'failed';
  hash: string;
  txHash?: string;
  blockchainUrl?: string;
  verifyUrl: string;
  certifiedAt: string;
}

interface BatchCertifyResult {
  results: CertifyResult[];
  total: number;
  succeeded: number;
  failed: number;
}

// ─── Config helper ────────────────────────────────────────────────────────────

function getConfig(runtime: IAgentRuntime): XProofConfig {
  const apiKey =
    runtime.getSetting('XPROOF_API_KEY') ?? process.env.XPROOF_API_KEY ?? '';
  const baseUrl =
    runtime.getSetting('XPROOF_BASE_URL') ??
    process.env.XPROOF_BASE_URL ??
    'https://xproof.app';
  return { apiKey, baseUrl };
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function callXProof(
  config: XProofConfig,
  path: string,
  body: Record<string, unknown>
): Promise<unknown> {
  if (!config.apiKey) {
    throw new Error(
      'XPROOF_API_KEY is not set. Get one at https://xproof.app'
    );
  }

  const res = await fetch(`${config.baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`xProof API error ${res.status}: ${text}`);
  }

  return res.json();
}

async function verifyCert(
  config: XProofConfig,
  certId: string
): Promise<unknown> {
  const res = await fetch(`${config.baseUrl}/api/proof/${certId}`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`xProof verify error ${res.status}: ${text}`);
  }

  return res.json();
}

// ─── Action: CERTIFY_CONTENT ──────────────────────────────────────────────────

const certifyContentAction: Action = {
  name: 'CERTIFY_CONTENT',
  similes: [
    'ANCHOR_CONTENT',
    'PROOF_CONTENT',
    'BLOCKCHAIN_CERTIFY',
    'CERTIFY_OUTPUT',
    'CERTIFY_DECISION',
    'CERTIFY_REPORT',
  ],
  description:
    'Certify text content, an agent output, a decision, or a report on the MultiversX blockchain via xProof. Returns a certificate ID and verification URL. Use when the agent needs to create a tamper-proof on-chain record of something.',
  validate: async (runtime: IAgentRuntime) => {
    const { apiKey } = getConfig(runtime);
    return !!apiKey;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    options: Record<string, unknown>,
    callback?: HandlerCallback
  ) => {
    const config = getConfig(runtime);
    const content =
      (options?.content as string) ?? message.content?.text ?? '';
    const metadata = (options?.metadata as Record<string, unknown>) ?? {};

    if (!content) {
      callback?.({ text: 'No content provided to certify.', error: true });
      return false;
    }

    try {
      const result = (await callXProof(config, '/api/proof', {
        content,
        metadata,
      })) as CertifyResult;

      const response = [
        `✅ Content certified on MultiversX blockchain.`,
        ``,
        `**Certificate ID:** ${result.id}`,
        `**Status:** ${result.status}`,
        `**Hash:** ${result.hash}`,
        `**Verify:** ${result.verifyUrl}`,
        result.blockchainUrl ? `**Explorer:** ${result.blockchainUrl}` : '',
        `**Certified at:** ${result.certifiedAt}`,
      ]
        .filter(Boolean)
        .join('\n');

      callback?.({ text: response, data: result });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      callback?.({ text: `xProof certification failed: ${msg}`, error: true });
      return false;
    }
  },
  examples: [
    [
      {
        user: '{{user1}}',
        content: { text: 'Certify this decision: deploy to production approved at 2026-02-20T14:00:00Z' },
      },
      {
        user: '{{agent}}',
        content: {
          text: '✅ Content certified on MultiversX blockchain.\n\n**Certificate ID:** cert_abc123\n**Status:** pending\n**Verify:** https://xproof.app/verify/cert_abc123',
          action: 'CERTIFY_CONTENT',
        },
      },
    ],
  ],
};

// ─── Action: CERTIFY_HASH ─────────────────────────────────────────────────────

const certifyHashAction: Action = {
  name: 'CERTIFY_HASH',
  similes: ['ANCHOR_HASH', 'PROOF_HASH', 'CERTIFY_FILE_HASH'],
  description:
    'Certify a SHA-256 hash on the MultiversX blockchain via xProof. Use when you already have a hash (e.g. of a file or document) and want to create an on-chain proof of existence.',
  validate: async (runtime: IAgentRuntime) => {
    const { apiKey } = getConfig(runtime);
    return !!apiKey;
  },
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    options: Record<string, unknown>,
    callback?: HandlerCallback
  ) => {
    const config = getConfig(runtime);
    const hash = options?.hash as string;
    const metadata = (options?.metadata as Record<string, unknown>) ?? {};

    if (!hash) {
      callback?.({ text: 'No hash provided. Expected a sha256:<hex> string.', error: true });
      return false;
    }

    try {
      const result = (await callXProof(config, '/api/proof', {
        hash,
        metadata,
      })) as CertifyResult;

      const response = [
        `✅ Hash certified on MultiversX blockchain.`,
        ``,
        `**Certificate ID:** ${result.id}`,
        `**Status:** ${result.status}`,
        `**Hash:** ${result.hash}`,
        `**Verify:** ${result.verifyUrl}`,
        result.blockchainUrl ? `**Explorer:** ${result.blockchainUrl}` : '',
        `**Certified at:** ${result.certifiedAt}`,
      ]
        .filter(Boolean)
        .join('\n');

      callback?.({ text: response, data: result });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      callback?.({ text: `xProof hash certification failed: ${msg}`, error: true });
      return false;
    }
  },
  examples: [
    [
      {
        user: '{{user1}}',
        content: { text: 'Certify hash sha256:abc123def456...' },
      },
      {
        user: '{{agent}}',
        content: {
          text: '✅ Hash certified on MultiversX blockchain.',
          action: 'CERTIFY_HASH',
        },
      },
    ],
  ],
};

// ─── Action: CERTIFY_BATCH ────────────────────────────────────────────────────

const certifyBatchAction: Action = {
  name: 'CERTIFY_BATCH',
  similes: ['BATCH_CERTIFY', 'ANCHOR_BATCH', 'PROOF_BATCH'],
  description:
    'Certify multiple items (up to 50) in a single blockchain transaction via xProof. Use when an agent pipeline produces multiple outputs that all need proof of existence.',
  validate: async (runtime: IAgentRuntime) => {
    const { apiKey } = getConfig(runtime);
    return !!apiKey;
  },
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    options: Record<string, unknown>,
    callback?: HandlerCallback
  ) => {
    const config = getConfig(runtime);
    const proofs = options?.proofs as Array<{ content?: string; hash?: string; metadata?: Record<string, unknown> }>;

    if (!proofs || !Array.isArray(proofs) || proofs.length === 0) {
      callback?.({ text: 'No proofs array provided for batch certification.', error: true });
      return false;
    }

    if (proofs.length > 50) {
      callback?.({ text: 'Batch limit is 50 items. Please split into smaller batches.', error: true });
      return false;
    }

    try {
      const result = (await callXProof(config, '/api/batch', { proofs })) as BatchCertifyResult;

      const response = [
        `✅ Batch certified on MultiversX blockchain.`,
        ``,
        `**Total:** ${result.total}`,
        `**Succeeded:** ${result.succeeded}`,
        `**Failed:** ${result.failed}`,
        ``,
        ...result.results.map((r, i) => `${i + 1}. ${r.id} — ${r.status} — ${r.verifyUrl}`),
      ].join('\n');

      callback?.({ text: response, data: result });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      callback?.({ text: `xProof batch certification failed: ${msg}`, error: true });
      return false;
    }
  },
  examples: [],
};

// ─── Action: VERIFY_PROOF ─────────────────────────────────────────────────────

const verifyProofAction: Action = {
  name: 'VERIFY_PROOF',
  similes: ['CHECK_CERT', 'VERIFY_CERT', 'CHECK_PROOF', 'LOOKUP_CERT'],
  description:
    'Verify the status of an xProof certificate by its ID. Returns on-chain status (pending/confirmed/failed) and blockchain details.',
  validate: async (runtime: IAgentRuntime) => {
    const { apiKey } = getConfig(runtime);
    return !!apiKey;
  },
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    options: Record<string, unknown>,
    callback?: HandlerCallback
  ) => {
    const config = getConfig(runtime);
    const certId = options?.certId as string;

    if (!certId) {
      callback?.({ text: 'No certificate ID provided.', error: true });
      return false;
    }

    try {
      const result = (await verifyCert(config, certId)) as CertifyResult;

      const statusEmoji = result.status === 'confirmed' ? '✅' : result.status === 'pending' ? '⏳' : '❌';

      const response = [
        `${statusEmoji} Certificate **${result.id}**`,
        ``,
        `**Status:** ${result.status}`,
        `**Hash:** ${result.hash}`,
        `**Verify:** ${result.verifyUrl}`,
        result.blockchainUrl ? `**Explorer:** ${result.blockchainUrl}` : '',
        `**Certified at:** ${result.certifiedAt}`,
      ]
        .filter(Boolean)
        .join('\n');

      callback?.({ text: response, data: result });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      callback?.({ text: `xProof verify failed: ${msg}`, error: true });
      return false;
    }
  },
  examples: [],
};

// ─── Plugin export ────────────────────────────────────────────────────────────

export const xproofPlugin: Plugin = {
  name: 'xproof',
  description:
    'Certify agent outputs on the MultiversX blockchain via xProof. Supports text, hashes, batch certification, and proof verification. $0.05/cert, 6-second finality, MX-8004 validation loop.',
  actions: [
    certifyContentAction,
    certifyHashAction,
    certifyBatchAction,
    verifyProofAction,
  ],
};

export default xproofPlugin;
