const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")

const BASE_FEE = ethers.parseEther("0.25")
const GAS_PRICE_LINK = 1e9

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const chainName = network.name

    if (developmentChains.includes(chainName)) {
        console.log("Deploying mock from deploy mock file")
        log("Local network detected! deploying mock")
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            args: [BASE_FEE, GAS_PRICE_LINK],
            log: true,
            waitConfirmation: network.config.blockConfirmations || 1,
        })
        log("Mock deployed")
        log("----------------------------------------------")
    }
}

module.exports.tags = ["all", "mocks"]
