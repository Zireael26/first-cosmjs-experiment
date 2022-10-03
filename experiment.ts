import { StargateClient, SigningStargateClient, IndexedTx } from "@cosmjs/stargate"
import { DirectSecp256k1HdWallet, OfflineDirectSigner } from "@cosmjs/proto-signing"
import { Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx"
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx"
import { readFile } from "fs/promises"

const rpc = "rpc.sentry-01.theta-testnet.polypore.xyz:26657"

const runAll = async (): Promise<void> => {
    const client = await StargateClient.connect(rpc)
    console.log("With client, chain id:", await client.getChainId(), ", height:", await client.getHeight())

    // console.log(
    //     "Alice balances:",
    //     // await client.getAllBalances("cosmos16ve6d3txsdxdx0w7k5hdl0dukjlqm03hkn2cw2")
    //     await client.getAllBalances("cosmos15aptdqmm7ddgtcrjvc5hs988rlrkze40l4q0he")
    // )

    const faucetTx: IndexedTx = (await client.getTx(
        "FFB7B70E87CDB1B4F24E0BBD8D836EF2EA2846D1EEA009A28557EC3B740087A2")
    )!

    // console.log("Faucet tx:", faucetTx)
    const decodedTx: Tx = Tx.decode(faucetTx.tx)
    // console.log("Decoded Tx:", decodedTx)
    // console.log("Decoded Tx body:", decodedTx.body!.messages)
    const typeUrl: string = decodedTx.body!.messages[0].typeUrl
    console.log("Type URL:", typeUrl)
    const sendMessage: MsgSend = MsgSend.decode(decodedTx.body!.messages[0].value)
    console.log("Sent message:", sendMessage)

    const aliceSigner: OfflineDirectSigner = await getAliceSignerFromMnemonic()
    const alice = (await aliceSigner.getAccounts())[0].address
    const faucet = "cosmos15aptdqmm7ddgtcrjvc5hs988rlrkze40l4q0he"
    console.log("Alice's address from signer: ", alice)

    const signingClient = await SigningStargateClient.connectWithSigner(rpc, aliceSigner)
    console.log(
        "With signing client, chain id:",
        await signingClient.getChainId(),
        ", height:",
        await signingClient.getHeight()
    )

    console.log("Gas Fee: ", decodedTx.authInfo!.fee!.amount)
    console.log("Gas Limit: ", decodedTx.authInfo!.fee!.gasLimit.toString(10))

    // Check balances before sending
    console.log("Alice balances before: ", await signingClient.getAllBalances(alice))
    console.log("Faucet balances before: ", await signingClient.getAllBalances(faucet))

    // execute the sendTokens Tx
    const result = await signingClient.sendTokens(
        alice,
        faucet,
        [{ denom: "uatom", amount: "100000" }],
        {
            amount: [{ denom: "uatom", amount: "1000" }],
            gas: "200000",
        },
        "Sending 100000 uatom from Alice to Faucet",
    )

    // Output the result of the tx
    console.log("Transfer Result: ", result)

    // Check balances after sending
    console.log("Alice balances before: ", await signingClient.getAllBalances(alice))
    console.log("Faucet balances before: ", await signingClient.getAllBalances(faucet))
}

const getAliceSignerFromMnemonic = async (): Promise<OfflineDirectSigner> => {
    return DirectSecp256k1HdWallet.fromMnemonic((await readFile("./testnet.alice.mnemonic.key")).toString(), {
        prefix: "cosmos",
    })
}

runAll()