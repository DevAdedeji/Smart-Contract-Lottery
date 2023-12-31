const { network, ethers } = require("hardhat")
const fs = require("fs")

const FRONTEND_ADDRESS_FILE = "../web3modal/constants/contractAddresses.json"

const FRONTEND_ABI_FILE = "../web3modal/constants/contractABI.json"

module.exports = async function () {
    updateContractAddresses()
    updateABI()
}

async function updateContractAddresses() {
    const raffle = await ethers.getContract("Raffle")
    const address = await raffle.getAddress()
    const chainId = network.config.chainId.toString()
    const currentAddresses = JSON.parse(
        fs.readFileSync(FRONTEND_ADDRESS_FILE, "utf-8"),
    )
    if (chainId in currentAddresses) {
        if (!currentAddresses[chainId].includes(address)) {
            currentAddresses[chainId].push(address)
        }
    } else {
        currentAddresses[chainId] = [address]
    }

    fs.writeFileSync(FRONTEND_ADDRESS_FILE, JSON.stringify(currentAddresses))
}

async function updateABI() {
    const raffle = await ethers.getContract("Raffle")
    fs.writeFileSync(
        FRONTEND_ABI_FILE,
        JSON.stringify(raffle.interface.format("json")),
    )
}

module.exports.tags = ["all", "frontend"]
