import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Predicoid1adaykeepsthedocteraway } from "../target/types/predicoid_1adaykeepsthedocteraway";

describe("predicoid_1adaykeepsthedocteraway", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Predicoid1adaykeepsthedocteraway as Program<Predicoid1adaykeepsthedocteraway>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
