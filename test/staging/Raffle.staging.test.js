const { ethers, getNamedAccounts, deployments, network } = require("hardhat")
const {
    developmentChains,
    networkConfig,
} = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle staging test", () => {
          let raffle,
              contractDeployer,
              entranceFee,
              raffleAddress,
              accounts,
              winnerStartingBalance
          beforeEach(async () => {
              const { deployer } = await getNamedAccounts()
              contractDeployer = deployer
              raffle = await ethers.getContract("Raffle", deployer)
              raffleAddress = await raffle.getAddress()
              entranceFee = await raffle.getEntranceFee()
          })
          describe("fulfillRandWornds", () => {
              it("works with live chainlink keepers and chainlink VRF, we get a random winner", async () => {
                  const startingTimeStamp = await raffle.getLatestTimeStamp()
                  accounts = await ethers.getSigners()
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          try {
                              const recentWinner =
                                  await raffle.getRecentWinner()
                              console.log(recentWinner)
                              const raffleState = await raffle.getRaffleState()
                              //   const winnerEndingBalance =
                              //       await accounts[0].getBalance()
                              //   console.log(winnerEndingBalance)
                              const endingTimeStamp =
                                  await raffle.getLatestTimeStamp()
                              const numPlayers =
                                  await raffle.getNumberOfPlayers()

                              assert.equal(numPlayers.toString(), "0")
                              assert.equal(
                                  recentWinner.toString(),
                                  accounts[0].address,
                              )
                              assert.equal(raffleState, 0)
                              //   assert.equal(
                              //       winnerEndingBalance.toString(),
                              //       (
                              //           winnerStartingBalance + entranceFee
                              //       ).toString(),
                              //   )
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (e) {
                              console.log(error)
                              reject(e)
                          }
                      })
                      //   Then entering the raffle
                      await raffle.enterRaffle({ value: entranceFee })
                      //   winnerStartingBalance = await accounts[0].getBalance()
                  })

                  //   enter the raffle
              })
          })
      })
