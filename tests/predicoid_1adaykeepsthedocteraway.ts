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
  const predictor_1 = Keypair.generate();
  const predictor_2 = Keypair.generate();
  const predictor_3 = Keypair.generate();

  let errorCode = '';


  it("Prepare accounts", async () => {

    let airdrop1 = await anchor.getProvider().connection.requestAirdrop(platform_admin.publicKey, 500 * LAMPORTS_PER_SOL).then(confirmTx).then(log);
    let airdrop2 = await anchor.getProvider().connection.requestAirdrop(marketAdmin.publicKey, 500 * LAMPORTS_PER_SOL).then(confirmTx).then(log);
    let airdrop3 = await anchor.getProvider().connection.requestAirdrop(liquidityProvider_1.publicKey, 500 * LAMPORTS_PER_SOL).then(confirmTx).then(log);
    let airdrop4 = await anchor.getProvider().connection.requestAirdrop(predictor_1.publicKey, 500 * LAMPORTS_PER_SOL).then(confirmTx).then(log);
    let airdrop5 = await anchor.getProvider().connection.requestAirdrop(predictor_2.publicKey, 500 * LAMPORTS_PER_SOL).then(confirmTx).then(log);
    let airdrop6 = await anchor.getProvider().connection.requestAirdrop(predictor_3.publicKey, 500 * LAMPORTS_PER_SOL).then(confirmTx).then(log);
  });

  it("Initialize platform Config", async () => {

    const tx = await program.methods.initializePlatform(
      99,
      /*  new BN(70), */
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

    const platformFee = accountData.platformFee;
    /* const poolFee = accountData.poolFee.toNumber(); */
    assert(platformFee == 99);
    /*  assert(poolFee == 70); */
  });

  it("Initialize Market", async () => {

    const configPda = PublicKey.findProgramAddressSync([
      Buffer.from("platform"),
      platform_admin.publicKey.toBytes(),
    ], program.programId)[0];


    //let errorCodeFee = '';
    const tx1 = await program.methods.initializeMarket("UpCenter".toString(), "socials".toString(), new BN(101))
      .signers([marketAdmin]).accountsPartial({
        marketOwner: marketAdmin.publicKey,
        platformConfig: configPda,
      }).rpc().then(confirmTx).then(log).catch(error => {
        console.log("error: ", error);
        errorCode = error.error.errorCode.code;
      });

    assert(errorCode === 'FeeOutOfBounds');


    let nameTooLong = 'this string will exceed the allowed size';
    errorCode = '';
    const tx2 = await program.methods.initializeMarket(nameTooLong, "socials".toString(), new BN(69))
      .signers([marketAdmin]).accountsPartial({
        marketOwner: marketAdmin.publicKey,
        platformConfig: configPda

      }).rpc().then(confirmTx).then(log).catch(error => {
        console.log("error: ", error);
        errorCode = error.error.errorCode.code;
      });

    assert(errorCode === 'MarketNameTooLong');

    const tx3 = await program.methods.initializeMarket("UpCenter".toString(), "socials".toString(), new BN(69))
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

    errorCode = '';

    const txError = await program.methods.addLiquidity(
      new BN(1_000_000_000)
    ).signers([liquidityProvider_1]).accountsPartial({
      provider: liquidityProvider_1.publicKey,
      poolConfig: poolConfigPda,
      platformConfig: configPlatformPda,
      poolVault: poolStatePda,
      market: marketPda
    }).rpc().then(confirmTx).then(log).catch(error => {
      console.log("error: ", error);
      errorCode = error.error.errorCode.code;
    });

    assert(errorCode === 'PlatformIsClosed');

    // update platform status
    const configPda = PublicKey.findProgramAddressSync([
      Buffer.from("platform"),
      platform_admin.publicKey.toBytes(),
    ], program.programId)[0];

    const configPlatformData1 = await program.account.config.fetch(configPda);
    assert(configPlatformData1.admin.toBase58 === platform_admin.publicKey.toBase58);
    console.log("Platform Config Data:", configPlatformData1);
    console.log("admin:", configPlatformData1.admin.toBase58());

    const txUpdateStatus = await program.methods.updatePlatformStatus(1)
      .signers([platform_admin]).accountsPartial({ platformConfig: configPda, admin: platform_admin.publicKey })
      .rpc().then(confirmTx).then(log);


    const configPlatformData2 = await program.account.config.fetch(configPda);

    assert(configPlatformData2.status === 1);


    const tx = await program.methods.addLiquidity(
      new BN(1_000_000_000)
    ).signers([liquidityProvider_1]).accountsPartial({
      provider: liquidityProvider_1.publicKey,
      poolConfig: poolConfigPda,
      platformConfig: configPlatformPda,
      poolVault: poolStatePda,
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

    const tx2 = await program.methods.addLiquidity(
      new BN(10_000_000_000)
    ).signers([liquidityProvider_1]).accountsPartial({
      provider: liquidityProvider_1.publicKey,
      poolConfig: poolConfigPda,
      platformConfig: configPlatformPda,
      poolVault: poolStatePda,
      market: marketPda
    }).rpc().then(confirmTx).then(log);

    const poolVaultData1 = await program.account.poolVaultState.fetch(poolStatePda);
    console.log("Pool State PDA:", poolVaultData1);

    const poolLiquidityState1 = await program.account.liquidityState.fetch(poolLiquidityState_);
    console.log("Pool Liquidity State PDA:", poolLiquidityState1);

    const liquidityPosition1 = await program.account.liquidityPosition.fetch(poolLiquidityPosition);
    console.log("Liquidity Position:", liquidityPosition1);

    const poolConfigPda1 = await program.account.poolConfig.fetch(poolConfigPda);
    console.log("Pool Config Data:", poolConfigPda1);

    // assert amount provided is correct on the liquidity position
    assert(liquidityPosition1.amountProvided.toString() === "11000000000");

    // assert amount provided is correct liquidity state
    assert(poolLiquidityState1.currentLiquidityAmount.toString() === "11000000000");

    // assert state of the pool config status is now 1 after target_liq_to_start was reached
    assert(poolConfigPda1.poolStatus === 1);

  })

  it("remove liquidity", async () => {

    const poolConfigPda = PublicKey.findProgramAddressSync([
      Buffer.from("pool"),
      marketAdmin.publicKey.toBytes(),
      platform_admin.publicKey.toBytes(),
      Buffer.from("UpCenter Event")
    ], program.programId)[0];

    const configPlatformPda = PublicKey.findProgramAddressSync([
      Buffer.from("platform"),
      platform_admin.publicKey.toBytes(),
    ], program.programId)[0];

    const marketPda = PublicKey.findProgramAddressSync([
      Buffer.from("market"),
      marketAdmin.publicKey.toBytes(),
      configPlatformPda.toBytes(),
    ], program.programId)[0];

    const poolStatePda = PublicKey.findProgramAddressSync([
      Buffer.from("pool_vault"),
      poolConfigPda.toBytes(),
    ], program.programId)[0];

    const tx = await program.methods.removeLiquidity(
      new BN(1_000_000_000)
    ).signers([liquidityProvider_1]).accountsPartial({
      provider: liquidityProvider_1.publicKey,
      poolConfig: poolConfigPda,
      platformConfig: configPlatformPda,
      poolVault: poolStatePda,
      market: marketPda
    }).rpc().then(confirmTx).then(log);

    const poolLiquidityState_ = PublicKey.findProgramAddressSync([
      Buffer.from("liquidity_state"),
      poolConfigPda.toBytes(),
    ], program.programId)[0];

    const poolLiquidityPosition = PublicKey.findProgramAddressSync([
      Buffer.from("liquidity_position"),
      poolConfigPda.toBytes(),
      liquidityProvider_1.publicKey.toBytes(),
    ], program.programId)[0];




    const poolVaultData1 = await program.account.poolVaultState.fetch(poolStatePda);
    console.log("Pool State PDA:", poolVaultData1);

    const poolLiquidityState1 = await program.account.liquidityState.fetch(poolLiquidityState_);
    console.log("Pool Liquidity State PDA:", poolLiquidityState1);

    const liquidityPosition1 = await program.account.liquidityPosition.fetch(poolLiquidityPosition);
    console.log("Liquidity Position:", liquidityPosition1);

    const poolConfigPda1 = await program.account.poolConfig.fetch(poolConfigPda);
    console.log("Pool Config Data:", poolConfigPda1);

    // assert amount provided is correct on the liquidity position
    console.log("Amount Provided:", liquidityPosition1.amountProvided.toString());
    assert(liquidityPosition1.amountProvided.toString() === "10000000000");

    // assert amount provided is correct liquidity state
    assert(poolLiquidityState1.currentLiquidityAmount.toString() === "10000000000");

    assert(poolVaultData1.amountSideA.toString() === "5000000000");
    assert(poolVaultData1.amountSideB.toString() === "5000000000");

    assert(liquidityPosition1.amountProvided.toString() === "10000000000");

    assert(poolLiquidityState1.currentLiquidityAmount.toString() === "10000000000");


  });

  it("predict side A", async () => {

    const poolConfigPda = PublicKey.findProgramAddressSync([
      Buffer.from("pool"),
      marketAdmin.publicKey.toBytes(),
      platform_admin.publicKey.toBytes(),
      Buffer.from("UpCenter Event")
    ], program.programId)[0];

    const configPlatformPda = PublicKey.findProgramAddressSync([
      Buffer.from("platform"),
      platform_admin.publicKey.toBytes(),
    ], program.programId)[0];

    const marketPda = PublicKey.findProgramAddressSync([
      Buffer.from("market"),
      marketAdmin.publicKey.toBytes(),
      configPlatformPda.toBytes(),
    ], program.programId)[0];

    const poolStatePda = PublicKey.findProgramAddressSync([
      Buffer.from("pool_vault"),
      poolConfigPda.toBytes(),
    ], program.programId)[0];

    const tx1 = await program.methods.placePrediction(
      new BN(3_000_000_000), "A".toString()
    ).signers([predictor_1]).accountsPartial({
      predictor: predictor_1.publicKey,
      poolConfig: poolConfigPda,
      platformConfig: configPlatformPda,
      poolVault: poolStatePda,
      market: marketPda
    }).rpc().then(confirmTx).then(log);

    const poolLiquidityState_ = PublicKey.findProgramAddressSync([
      Buffer.from("liquidity_state"),
      poolConfigPda.toBytes(),
    ], program.programId)[0];

    const poolLiquidityPosition = PublicKey.findProgramAddressSync([
      Buffer.from("liquidity_position"),
      poolConfigPda.toBytes(),
      liquidityProvider_1.publicKey.toBytes(),
    ], program.programId)[0];

    const predictor1PDA = PublicKey.findProgramAddressSync([
      Buffer.from("predictor_position"),
      poolConfigPda.toBytes(),
      predictor_1.publicKey.toBytes(),
    ], program.programId)[0];

    const predictor2PDA = PublicKey.findProgramAddressSync([
      Buffer.from("predictor_position"),
      poolConfigPda.toBytes(),
      predictor_2.publicKey.toBytes(),
    ], program.programId)[0];

    const predictor3PDA = PublicKey.findProgramAddressSync([
      Buffer.from("predictor_position"),
      poolConfigPda.toBytes(),
      predictor_3.publicKey.toBytes(),
    ], program.programId)[0];


    let predictor1State = await program.account.predictorPosition.fetch(predictor1PDA);

    let poolVaultData1 = await program.account.poolVaultState.fetch(poolStatePda);
    console.log("Pool State PDA:", poolVaultData1);


    console.log("Side A amount: ", poolVaultData1.amountSideA.toString());
    console.log("Side B amount: ", poolVaultData1.amountSideB.toString());
    let balance = await anchor.getProvider().connection.getBalance(poolStatePda).then(amount => console.log("Vault Balance: ", amount));

    console.log("Predictor State : ", predictor1State);
    console.log("Predictor State - side A amount:", predictor1State.sideAAmount.toString());
    console.log("Predictor State - side B amount:", predictor1State.sideBAmount.toString());
    console.log("Predictor State - side A entry odd:", predictor1State.sideAEntryOdd.toString());
    console.log("Predictor State - side B entry odd:", predictor1State.sideBEntryOdd.toString());


    const tx2 = await program.methods.placePrediction(
      new BN(6_000_000_000), "A".toString()
    ).signers([predictor_2]).accountsPartial({
      predictor: predictor_2.publicKey,
      poolConfig: poolConfigPda,
      platformConfig: configPlatformPda,
      poolVault: poolStatePda,
      market: marketPda
    }).rpc().then(confirmTx).then(log);

    const tx3 = await program.methods.placePrediction(
      new BN(3_000_000_000), "B".toString()
    ).signers([predictor_3]).accountsPartial({
      predictor: predictor_3.publicKey,
      poolConfig: poolConfigPda,
      platformConfig: configPlatformPda,
      poolVault: poolStatePda,
      market: marketPda
    }).rpc().then(confirmTx).then(log);

    predictor1State = await program.account.predictorPosition.fetch(predictor1PDA);
    let predictor2State = await program.account.predictorPosition.fetch(predictor2PDA);
    let predictor3State = await program.account.predictorPosition.fetch(predictor3PDA);

    poolVaultData1 = await program.account.poolVaultState.fetch(poolStatePda);
    console.log("Pool State PDA:", poolVaultData1);


    console.log("Side A amount: ", poolVaultData1.amountSideA.toString());
    console.log("Side B amount: ", poolVaultData1.amountSideB.toString());
    balance = await anchor.getProvider().connection.getBalance(poolStatePda).then(amount => console.log("Vault Balance: ", amount));

    console.log("Predictor1 State : ", predictor1State);
    console.log("Predictor1 State - side A amount:", predictor1State.sideAAmount.toString());
    console.log("Predictor1 State - side B amount:", predictor1State.sideBAmount.toString());
    console.log("Predictor1 State - side A entry odd:", predictor1State.sideAEntryOdd.toString());
    console.log("Predictor1 State - side B entry odd:", predictor1State.sideBEntryOdd.toString());

    console.log("Predictor2 State : ", predictor2State);
    console.log("Predictor2 State - side A amount:", predictor2State.sideAAmount.toString());
    console.log("Predictor2 State - side B amount:", predictor2State.sideBAmount.toString());
    console.log("Predictor2 State - side A entry odd:", predictor2State.sideAEntryOdd.toString());
    console.log("Predictor2 State - side B entry odd:", predictor2State.sideBEntryOdd.toString());

    console.log("Predictor3 State : ", predictor3State);
    console.log("Predictor3 State - side A amount:", predictor3State.sideAAmount.toString());
    console.log("Predictor3 State - side B amount:", predictor3State.sideBAmount.toString());
    console.log("Predictor3 State - side A entry odd:", predictor3State.sideAEntryOdd.toString());
    console.log("Predictor3 State - side B entry odd:", predictor3State.sideBEntryOdd.toString());

   // TODO - do some assertions here


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
    if (SOLANA_VALIDATOR) {
      console.log(
        `Your transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom`)
    } else {
      console.log(
        `signature: ${signature}`
      );
    }
    return signature;
  };
});
