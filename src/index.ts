import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
    name:"walletmcp",
    version:"0.0.1",
    capabilities:{
        resources:{},
        tools:{},

    }
});

import { Connection, PublicKey, 
  clusterApiUrl, 
  Keypair, 
  Transaction, 
  sendAndConfirmTransaction ,  
  SystemProgram,  
  ParsedInstruction,
  ParsedTransactionWithMeta,
  TransactionMessage,
  PartiallyDecodedInstruction,
  CompiledInstruction} from "@solana/web3.js";


const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');


async function listBuffers(payerKey: any) {
  const payer=Keypair.fromSecretKey(Uint8Array.from(payerKey))

  const accounts = await connection.getProgramAccounts(
    new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111"), 
    {
      filters: [
        { dataSize: 165 }, 
        { memcmp: { offset: 1, bytes: payer.publicKey.toBase58() } }, // authority
      ],
    }
  );

  return accounts;
}

async function closeBuffer(bufferPubkey: any, payerKey: any) {
  const payer=Keypair.fromSecretKey(Uint8Array.from(payerKey))
  const bufferPubkeyObj = new PublicKey(bufferPubkey);
  const BPF_LOADER_UPGRADEABLE_PROGRAM_ID=  new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111")

  
  const tx = new Transaction();

  tx.add({
    keys: [
      { pubkey: bufferPubkey, isSigner: false, isWritable: true }, 
      { pubkey: payer.publicKey, isSigner: false, isWritable: true }, 
      { pubkey: payer.publicKey, isSigner: true, isWritable: false }, 
    ],
    programId: BPF_LOADER_UPGRADEABLE_PROGRAM_ID,
    data: Buffer.from([4]), 
  });

  const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
  console.log("Closed buffer:", bufferPubkey.toBase58());
  console.log("Tx Signature:", sig);
}


async function getBalance(walletAddress: string) {
  const publicKey = new PublicKey(walletAddress);
  const balanceLamports = await connection.getBalance(publicKey);
  const balanceSOL = balanceLamports / 1e9; 
  return `Balance of ${walletAddress}: ${balanceSOL} SOL`
}

async function getTransactions(address: string,limit: number) {
    const publicKey =new PublicKey(address);
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit: limit });
    const transactions = await Promise.all(
      signatures.map(sig => connection.getTransaction(sig.signature, { maxSupportedTransactionVersion: 0 }))
    );

    return transactions;
  }
  
server.tool(
    "getTransactions",
    "get transactions of a wallet\n Limits are to specify the number of transactions to retrieve",
    {
        walletAddress:z.string(),
        limit:z.number()
    },
     async({walletAddress,limit})=>{
        const transactions = await getTransactions(walletAddress,limit)
        if(!transactions){
            return {
                content: [
                  {
                    type: "text",
                    text: `Failed to retrieve transactions for wallet adress: ${walletAddress}`,
                  },
                ],
              };
        }
    
        if(transactions.length === 0){
            return {
                content: [
                  {
                    type: "text",
                    text: `No transactions found for wallet adress: ${walletAddress}`,
                  },
                ],
              };
        }
        return {
            content: [
              {
                type: "text",
                text: `Transactions for wallet adress: ${walletAddress}`,
                items: transactions.map(transaction => ({
                    type: "text",
                    text: `Transaction: ${transaction}`,
                  })),
              }
            ],
        }
      


     }
)

server.tool(
    "getBalance",
    "get balance of a wallet",
    {
        walletAddress:z.string()
    },
     async({walletAddress})=>{
        const balance = await getBalance(walletAddress)
        if(!balance){
            return {
                content: [
                  {
                    type: "text",
                    text: `Failed to retrieve wallet adress: ${walletAddress}`,
                  },
                ],
              };
        }
        
        return {
            content: [
              {
                type: "text",
                text: `Successfully retrieved the balance of wallet adress: ${walletAddress}
                 ${walletAddress}:{
                  balance:${balance}
                 }   

                `,
              },
            ],
          };
     }
    )

server.tool(
    "listBuffers",
    "List program buffers associated with a specific payer",
    {
        payerKey: z.array(z.number())
    },
    async({payerKey}, extra) => {
        try {
            const accounts = await listBuffers(payerKey);
            
            if (!accounts || accounts.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "No program buffers found for this payer."
                        }
                    ]
                };
            }
            
            return {
                content: [
                    {
                        type: "text",
                        text: `Found ${accounts.length} program buffer(s):`,
                        items: accounts.map(account => ({
                          type: "text",
                          text: `Buffer: ${account.pubkey.toString()}`
                      }))
                    }
                ]
            };
        } catch (error:any) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error listing buffers: ${error}`
                    }
                ]
            };
        }
    }
);

async function getProgramLogs(programIdStr: string, limit: number) {
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const programId = new PublicKey(programIdStr);

  const signatures = await connection.getSignaturesForAddress(programId, { limit });

  const logs: any[] = [];

  for (const sigInfo of signatures) {
    const tx = await connection.getTransaction(sigInfo.signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (tx && tx.meta && tx.meta.logMessages) {
      let instructions: any[] = [];

      if ("instructions" in tx.transaction.message) {
        instructions = tx.transaction.message.instructions;
      }
      else {
        const message = TransactionMessage.decompile(tx.transaction.message);
        instructions = message.instructions;
      }

      logs.push({
        signature: sigInfo.signature,
        slot: sigInfo.slot,
        logs: tx.meta.logMessages,
        instructions: instructions.map((ix) => {
          if ("parsed" in ix) {
            return {
              program: ix.program,
              programId: ix.programId.toBase58(),
              parsed: ix.parsed,
            };
          } else {
            return {
              programId: ix.programId.toBase58(),
              data: ix.data,
            };
          }
        }),
      });
    }
  }

  return logs;
}



server.tool(
    "closeBuffer",
    "Close a specific program buffer and return funds to the payer",
    {
        bufferPubkey: z.string(),
        payerKey: z.array(z.number())
    },
    async({bufferPubkey, payerKey}, extra) => {
        try {
            const bufferPublicKey = new PublicKey(bufferPubkey);
            await closeBuffer(bufferPublicKey, payerKey);
            
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully closed buffer: ${bufferPubkey}`
                    }
                ]
            };
        } catch (error:any) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error closing buffer: ${error.message}`
                    }
                ]
            };
        }
    }
);

server.tool(
    "getProgramLogs",
    "Get transaction logs for a specific Solana program",
    {
        programId: z.string(),
        limit: z.number().optional().default(10)
    },
    async({programId, limit = 10}) => {
        try {
            const logs = await getProgramLogs(programId, limit);
            
            if (!logs || logs.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `No transaction logs found for program: ${programId}`
                        }
                    ]
                };
            }
            
            return {
                content: [
                    {
                        type: "text",
                        text: `Found ${logs.length} transaction(s) for program: ${programId}`,
                        items: logs.map(log => ({
                            type: "text",
                            text: `Transaction: ${log.signature}\nSlot: ${log.slot}\nLog Messages: ${log.logs.length > 0 ? log.logs.join('\n') : 'No logs'}`
                        }))
                    }
                ]
            };
        } catch (error:any) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error retrieving program logs: ${error.message || error}`
                    }
                ]
            };
        }
    }
);


async function sendSolTransaction(
  fromPrivateKey:number[],
  toPublicKeyStr: string,
  amountSol: number,
  mode:"main"|"dev",
){
  const rpcUrl = mode === "main" ? "https://api.mainnet-beta.solana.com" : "https://api.devnet.solana.com" 
  const connection = new Connection(rpcUrl, "confirmed");

  const fromKeypair = Keypair.fromSecretKey(Uint8Array.from(fromPrivateKey));
 
  const toPublicKey = new PublicKey(toPublicKeyStr);

  const LAMPORTS_PER_SOL = 1e9;
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: toPublicKey,
      lamports: amountSol * LAMPORTS_PER_SOL,
    })
  );

  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromKeypair.publicKey;

  transaction.sign(fromKeypair);

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [fromKeypair],
    { skipPreflight: true }
  )

  return signature;

}


server.tool(
    "sendSolTransaction",
    "Send SOL from one wallet to another",
    {
        fromPrivateKey: z.array(z.number()),
        toPublicKey: z.string(),
        amountSol: z.number(),
        mode: z.enum(["main", "dev"]).default("dev")
    },
    async({fromPrivateKey, toPublicKey, amountSol, mode = "dev"}) => {
        try {
            const signature = await sendSolTransaction(
                fromPrivateKey,
                toPublicKey,
                amountSol,
                mode
            );
            
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully sent ${amountSol} SOL to ${toPublicKey}`,
                        items: [
                            {
                                type: "text",
                                text: `Transaction signature: ${signature}`
                            },
                            {
                                type: "text",
                                text: `Network: ${mode === "main" ? "Mainnet" : "Devnet"}`
                            }
                        ]
                    }
                ]
            };
        } catch (error:any) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error sending transaction: ${error.message || error}`
                    }
                ]
            };
        }
    }
);


async function main() {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Wallet MCP Server running on stdio");
      }
      
      main().catch((error) => {
        console.error("Fatal error in main():", error);
        process.exit(1);
      });
