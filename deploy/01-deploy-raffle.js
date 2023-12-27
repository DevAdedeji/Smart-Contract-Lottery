const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    let vrfCoordinatorV2Address
    const chainId = network.config.chainId
    let subscriptionId

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract(
            "VRFCoordinatorV2Mock",
        )
        vrfCoordinatorV2Address = await vrfCoordinatorV2Mock.getAddress()
        const transactionResponse =
            await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait()
        subscriptionId = transactionReceipt.logs[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(
            subscriptionId,
            ethers.parseEther("2"),
        )
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = process.env.SUBSCRIPTION_ID
    }

    const entranceFee =
        networkConfig[chainId]["entranceFee"] || ethers.parseEther("0.01")

    const gasLane =
        networkConfig[chainId]["gasLane"] ||
        "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c"
    const callbackGasLmit =
        networkConfig[chainId]["callbackGasLmit"] || "500000"
    const interval = networkConfig[chainId]["interval"] || "30"

    const args = [
        vrfCoordinatorV2Address,
        entranceFee,
        gasLane,
        subscriptionId,
        callbackGasLmit,
        interval,
    ]

    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmation: network.config.blockConfirmations || 1,
    })
    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        log("Verifying.....")
        await verify(raffle.address, args)
    }
    log("-------------------------------------------------------------------")
}

module.exports.tags = ["all", "raffle"]
