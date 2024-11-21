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
  const liquidityProvider_1 = Keypair.generate();
  const liquidityProvider_2 = Keypair.generate();
  

  it("Prepare accounts", async () => {
    
    let airdrop1 = await anchor.getProvider().connection.requestAirdrop(platform_admin.publicKey, 500 * LAMPORTS_PER_SOL).then(confirmTx).then(log);
    let airdrop2 = await anchor.getProvider().connection.requestAirdrop(marketAdmin.publicKey, 500 * LAMPORTS_PER_SOL).then(confirmTx).then(log);
    let airdrop3 = await anchor.getProvider().connection.requestAirdrop(liquidityProvider_1.publicKey, 500 * LAMPORTS_PER_SOL).then(confirmTx).then(log);
    let airdrop4 = await anchor.getProvider().connection.requestAirdrop(liquidityProvider_2.publicKey, 500 * LAMPORTS_PER_SOL).then(confirmTx).then(log);
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
    const tx1 = await program.methods.initializeMarket("UpCenter".toString(), "socials".toString(), new BN(101))
      .signers([marketAdmin]).accountsPartial({
        marketOwner: marketAdmin.publicKey,
        platformConfig: configPda,
      }).rpc().then(confirmTx).then(log).catch(error => {
        console.log("error: ",error);
        errorCodeFee = error.error.errorCode.code;
      });

    assert(errorCodeFee === 'FeeOutOfBounds');


    let nameTooLong = 'this string will exceed the allowed size';
    let errorCodeName = '';
    const tx2 = await program.methods.initializeMarket(nameTooLong, "socials".toString(), new BN(69))
      .signers([marketAdmin]).accountsPartial({
        marketOwner: marketAdmin.publicKey,
        platformConfig: configPda

      }).rpc().then(confirmTx).then(log).catch(error => {
        console.log("error: ",error);
        errorCodeName = error.error.errorCode.code;
      });

    assert(errorCodeName === 'MarketNameTooLong');

    const tx3 = await program.methods.initializeMarket("UpCenter".toString(),"socials".toString(), new BN(69))
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

  it("Deposit Liquidity in the pool", async () => {

    const eventDescription = "UpCenter Event";
    const sideA = "Side A";
    const sideB = "Side B";

    

    const poolConfigPda = PublicKey.findProgramAddressSync([
      Buffer.from("pool"), 
      marketAdmin.publicKey.toBytes(),
      platform_admin.publicKey.toBytes(),
      Buffer.from(eventDescription)
    ], program.programId)[0];  
    console.log("Pool Config PDA:", poolConfigPda.toBase58());

  const configPlatformPda = PublicKey.findProgramAddressSync([
    Buffer.from("platform"), 
    platform_admin.publicKey.toBytes(), 
  ], program.programId)[0];
  console.log("Platform Config PDA:", configPlatformPda.toBase58());

  const marketPda = PublicKey.findProgramAddressSync([
    Buffer.from("market"), 
    marketAdmin.publicKey.toBytes(),
    configPlatformPda.toBytes(),
  ], program.programId)[0];  
  console.log("Market PDA:", marketPda.toBase58());

  const poolStatePda = PublicKey.findProgramAddressSync([
    Buffer.from("pool_vault"), 
    poolConfigPda.toBytes(),
  ], program.programId)[0];  
  console.log("Pool State PDA:", poolStatePda.toBase58());

  const tx = await program.methods.addLiquidity(
      new BN(1_000_000_000)
  ).signers([liquidityProvider_1]).accountsPartial({
      provider: liquidityProvider_1.publicKey,
      poolConfig: poolConfigPda,
      platformConfig: configPlatformPda,
      poolVault:poolStatePda,
      market: marketPda
  }).rpc().then(confirmTx).then(log); 

  const poolLiquidityState_ = PublicKey.findProgramAddressSync([
    Buffer.from("liquidity_state"), 
    poolConfigPda.toBytes(),
  ], program.programId)[0];  
  console.log("Pool Liquidity State:", poolLiquidityState_.toBase58());


  const poolVaultData = await program.account.poolVaultState.fetch(poolStatePda);
  console.log("Pool State PDA:", poolVaultData);
  assert(poolVaultData.amountSideA.toString() === "500000000");
  assert(poolVaultData.amountSideB.toString() === "500000000");

  const poolLiquidityState = await program.account.liquidityState.fetch(poolLiquidityState_);
  console.log("Pool Liquidity State PDA:", poolLiquidityState);

  const poolLiquidityPosition = PublicKey.findProgramAddressSync([
    Buffer.from("liquidity_position"), 
    poolConfigPda.toBytes(),
    liquidityProvider_1.publicKey.toBytes(),
  ], program.programId)[0];  
  console.log("Pool/Liquidity Position/Per user:", poolLiquidityPosition.toBase58());

  const liquidityPosition = await program.account.liquidityPosition.fetch(poolLiquidityPosition);
  console.log("Liquidity Position:", liquidityPosition);
  assert(liquidityPosition.amountProvided.toString() === "1000000000");
  
  })












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
