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

    const tx = await program.methods.initializePlatform(
      new BN(99),
      new BN(70),
    ).signers([platform_admin]).accountsPartial({
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
    assert(platformFee == 99);
    assert(poolFee == 70);
  });

  it("Initialize Market", async () => {

    const configPda = PublicKey.findProgramAddressSync([
      Buffer.from("platform"), 
      platform_admin.publicKey.toBytes(), 
  ], program.programId)[0];  

  let errorCodeFee = '';
    const tx1 = await program.methods.initializeMarket("UpCenter".toString(), new BN(101))
      .signers([marketAdmin]).accountsPartial({
        marketOwner: marketAdmin.publicKey,
        platformConfig: configPda

      }).rpc().then(confirmTx).then(log).catch(error => {
        console.log("error: ",error);
        errorCodeFee = error.error.errorCode.code;
      });

    assert(errorCodeFee === 'FeeOutOfBounds');


    let nameTooLong = 'this string will exceed the allowed size';
    let errorCodeName = '';
    const tx2 = await program.methods.initializeMarket(nameTooLong, new BN(69))
      .signers([marketAdmin]).accountsPartial({
        marketOwner: marketAdmin.publicKey,
        platformConfig: configPda

      }).rpc().then(confirmTx).then(log).catch(error => {
        console.log("error: ",error);
        errorCodeName = error.error.errorCode.code;
      });

    assert(errorCodeName === 'MarketNameTooLong');

    const tx3 = await program.methods.initializeMarket("UpCenter".toString(), new BN(69))
      .signers([marketAdmin]).accountsPartial({
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

    const marketFee = accountData.marketFee.toNumber();
    const marketName = accountData.marketName.toString();
    assert(marketFee === 69);
    assert(marketName === "UpCenter"); 

    
  });

  it("Initialize Pool", async () => {

    const eventDescription = "UpCenter Event";
    const sideA = "Side A";
    const sideB = "Side B";

    const configPda = PublicKey.findProgramAddressSync([
      Buffer.from("platform"), 
      platform_admin.publicKey.toBytes(), 
  ], program.programId)[0];
  console.log("Config PDA:", configPda.toBase58());

    const tx = await program.methods.initializePool(
      new BN(1).toNumber(),
      new BN(10_000_000_000),
      eventDescription,
      sideA,
      sideB,
    ).signers([marketAdmin]).accountsPartial({
      marketAdmin: marketAdmin.publicKey,
      platformConfig: configPda
    }).rpc().then(confirmTx).then(log); 


    const poolConfigPda = PublicKey.findProgramAddressSync([
      Buffer.from("pool"), 
      marketAdmin.publicKey.toBytes(),
      platform_admin.publicKey.toBytes(),
      Buffer.from(eventDescription)
    ], program.programId)[0];  
    console.log("Pool Config PDA:", poolConfigPda);

    const poolStatePda = PublicKey.findProgramAddressSync([
      Buffer.from("pool_vault"), 
      poolConfigPda.toBytes(),
    ], program.programId)[0];  

    console.log("Pool State PDA:", poolStatePda);

    const poolConfigData = await program.account.poolConfig.fetch(poolConfigPda);
    console.log("Pool Config Data:", poolConfigData);
    const poolVaultData = await program.account.poolVaultState.fetch(poolStatePda);
    console.log("Pool Vault Data:", poolVaultData);
    const amountSideA = poolVaultData.amountSideA.toNumber();
    console.log("Amount Side A:", amountSideA);
    const amountSideB = poolVaultData.amountSideB.toNumber();
    console.log("Amount Side B:", amountSideB);
    
    assert(amountSideA === 0);
    assert(amountSideB === 0);
    assert(poolConfigData.minDaysToRun === 1);
    assert(poolConfigData.targetLiqToStart.toString() === new BN(10_000_000_000).toString());
  })


/*   let nameTooLong = 'srefsdfsdfsdfsdfsdfsdfsdf sad asd';
  const encoder = new TextEncoder();
  const byteLength = encoder.encode(nameTooLong).length;
  console.log("Byte Length:", byteLength); */











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
