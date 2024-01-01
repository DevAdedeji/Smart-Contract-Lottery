const { ethers, network } = require("hardhat")
let vrfCoordinatorV2Mock, raffle, raffleAddress
async function mockKeepers() {
    raffle = await ethers.getContract("Raffle")
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
    const subscriptionId = await raffle.getSubscriptionId()
    raffleAddress = await raffle.getAddress()
    await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffleAddress)
    const checkData = ethers.keccak256(ethers.toUtf8Bytes(""))
    const { upkeepNeeded } = await raffle.checkUpkeep.staticCall(checkData)
    if (upkeepNeeded) {
        const tx = await raffle.performUpkeep(checkData)
        const txReceipt = await tx.wait(1)
        const requestId = txReceipt.logs[1].args.requestId
        console.log(`Performed upkeep with RequestId: ${requestId}`)
        if (network.config.url == "http://127.0.0.1:8545") {
            console.log("Hello")
            await mockVrf(requestId, raffle)
        }
    } else {
        console.log("No upkeep needed!")
    }
}

async function mockVrf(requestId, raffle) {
    console.log("We on a local network? Ok let's pretend...")
    await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffleAddress)
    console.log("Responded!")
    const recentWinner = await raffle.getRecentWinner()
    console.log(`The winner is: ${recentWinner}`)
}

mockKeepers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
