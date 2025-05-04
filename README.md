# WalletMCP - Solana Blockchain MCP Server

WalletMCP is a Model Context Protocol (MCP) server implementation for interacting with the Solana blockchain. 
It exposes developer-friendly tools for working with wallets, transactions, program buffers, logs, and SOL transfers through MCP-compatible interfaces.

---

## 🧠 Features

- 🔍 Retrieve wallet transactions and SOL balances.
- 📜 Access program logs from the Solana blockchain.
- 🧾 Claims Unused Rents (List and close BPF Upgradeable Loader buffers).
- 💸 Send SOL transactions programmatically.
- 🧩 Fully MCP-compliant tool definitions using Zod for schema validation.

---

## 📦 Project Structure

```
walletmcp/
├── index.ts
└── README.md
```

---

## ⚙️ Tools & Their Descriptions

### `getTransactions`
**Description**: Retrieve recent transactions of a wallet.  
**Inputs**:
- `walletAddress` (string)
- `limit` (number) - maximum number of transactions to fetch.

### `getBalance`
**Description**: Fetch the SOL balance of a wallet.  
**Inputs**:
- `walletAddress` (string)

### `listBuffers`
**Description**: List program buffers associated with a payer key.  
**Inputs**:
- `payerKey` (array of numbers)

### `closeBuffer`
**Description**: Close a buffer and return lamports to the payer.  
**Inputs**:
- `bufferPubkey` (string)
- `payerKey` (array of numbers)

### `getProgramLogs`
**Description**: Fetch transaction logs from a specific program ID.  
**Inputs**:
- `programId` (string)
- `limit` (number) - optional, default is 10

### `sendSolTransaction`
**Description**: Send SOL from one wallet to another.  
**Inputs**:
- `fromPrivateKey` (array of numbers)
- `toPublicKeyStr` (string)
- `amountSol` (number)
- `mode` ("main" | "dev")

---

## 🔧 Technologies Used

- **Solana Web3.js SDK** – Solana blockchain interaction
- **Model Context Protocol (MCP)** – Protocol for tool registration
- **Zod** – Input validation
- **TypeScript** – Strong typing and modern tooling

---

## 📋 Requirements

- Node.js v16+
- Yarn or npm

---

## 🚀 Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run the MCP Server**
   ```bash
   npm run build
   ```

3. **Use registered tools via MCP clients**

---

## 🛡️ Security Considerations

- Always protect your private keys.
- Never expose secret keys or send SOL from unsecured sources.

---

## 📄 License

MIT License.