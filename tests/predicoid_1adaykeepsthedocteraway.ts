import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Predicoid1adaykeepsthedocteraway } from "../target/types/predicoid_1adaykeepsthedocteraway";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { assert } from "chai";
import { BN } from "bn.js";

describe("predicoid_1adaykeepsthedocteraway", () => {

  let SOLANA_VALIDATOR = true;
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Predicoid1adaykeepsthedocteraway as Program<Predicoid1adaykeepsthedocteraway>;
  let platform_admin = Keypair.generate();
  const marketAdmin = Keypair.generate();
  

  it("Prepare accounts", async () => {
    
    let airdrop1 = await anchor.getProvider().connection.requestAirdrop(platform_admin.publicKey, 500 * LAMPORTS_PER_SOL).then(confirmTx).then(log);
    let airdrop2 = await anchor.getProvider().connection.requestAirdrop(marketAdmin.publicKey, 500 * LAMPORTS_PER_SOL).then(confirmTx).then(log);
  });

  it("Initialize platform Config", async () => {

    const tx = await program.methods.initializePlatform().signers([platform_admin]).accountsPartial({
      admin: platform_admin.publicKey,
    }).signers([platform_admin]).rpc().then(confirmTx).then(log);

    const configPda = PublicKey.findProgramAddressSync([
      Buffer.from("platform"), 
      platform_admin.publicKey.toBytes(), 
    ], program.programId)[0];  
    

    const accountData = await program.account.config.fetch(configPda);
    console.log("PDA Account Data:", accountData);
    //console.log("Your transaction signature", tx);

    const platformFee = accountData.platformFee.toNumber();
    const poolFee = accountData.poolFee.toNumber();
    assert(platformFee == 100);
    assert(poolFee == 100);
  });

  it("Initialize Market", async () => {

    const configPda = PublicKey.findProgramAddressSync([
      Buffer.from("platform"), 
      platform_admin.publicKey.toBytes(), 
  ], program.programId)[0];  

    const tx = await program.methods.initializeMarket("UpCenter".toString(), new BN(100))
      .signers([marketAdmin]).accounts({
        marketOwner: marketAdmin.publicKey,
        platformConfig: configPda

      }).rpc().then(confirmTx).then(log);

    

    const marketPda = PublicKey.findProgramAddressSync([
      Buffer.from("market"), 
      marketAdmin.publicKey.toBytes(),
      configPda.toBytes(),
    ], program.programId)[0];  
    

    const accountData = await program.account.market.fetch(marketPda);
    console.log("PDA Account Data:", accountData);
    //console.log("Your transaction signature", tx);

    const marketFee = accountData.marketFee.toNumber();
    const marketName = accountData.marketName.toString();
    assert(marketFee === 100);
    assert(marketName === "UpCenter"); 
  });
























  const confirmTx = async (signature: string) => {
    const latestBlockhash = await anchor.getProvider().connection.getLatestBlockhash();
    await anchor.getProvider().connection.confirmTransaction(
      {
        signature,
        ...latestBlockhash,
      },
      'confirmed'
    )
    return signature
  }

  const log = async (signature: string): Promise<string> => {
    if(SOLANA_VALIDATOR){
      console.log(
      `Your transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom`)
    }else{
      console.log(
        `signature: ${signature}`
      );
    }
    return signature;
  };
});
