const { ethers, getNamedAccounts, deployments, network } = require("hardhat")
const {
    developmentChains,
    networkConfig,
} = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle unit test", () => {
          let raffle,
              raffleContract,
              vrfCoordinatorV2Mock,
              chainId,
              contractDeployer,
              entranceFee,
              interval,
              raffleAddress,
              player
          const notEnoughSendValue = ethers.parseEther("0.0000001")
          beforeEach(async () => {
              const { deployer } = await getNamedAccounts()
              contractDeployer = deployer
              //   let accounts = await ethers.getSigners() // could also do with getNamedAccounts
              //   //   deployer = accounts[0]
              //   player = accounts[1]
              chainId = network.config.chainId
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract(
                  "VRFCoordinatorV2Mock",
                  player,
              )
              const subscriptionId = await raffle.getSubscriptionId()
              raffleAddress = await raffle.getAddress()
              await vrfCoordinatorV2Mock.addConsumer(
                  subscriptionId,
                  raffleAddress,
              )
              entranceFee = await raffle.getEntranceFee()
              interval = await raffle.getInterval()
          })

          describe("constructor", () => {
              it("initializes the raffle correctly", async () => {
                  const raffleState = await raffle.getRaffleState()
                  const interval = await raffle.getInterval()
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(
                      interval.toString(),
                      networkConfig[chainId]["interval"],
                  )
              })
          })

          describe("enter raffle", () => {
              it("reverts when you don't pay enough", async () => {
                  await expect(
                      raffle.enterRaffle({ value: notEnoughSendValue }),
                  ).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__NotEnoughEntranceFee",
                  )
              })
              it("User entered raffle successfully", async () => {
                  await raffle.enterRaffle({ value: entranceFee })
                  const player = await raffle.getPlayer(0)
                  assert.equal(contractDeployer, player)
              })
              it("Emits event on enter", async () => {
                  await expect(
                      raffle.enterRaffle({ value: entranceFee }),
                  ).to.emit(raffle, "RaffleEnter")
              })
              it("Doesn't allow entrance when raffle is calculating", async () => {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [
                      ethers.toNumber(interval) + 1,
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  // we pretend to be a keeper for a second
                  await raffle.performUpkeep("0x")
                  await expect(
                      raffle.enterRaffle({ value: entranceFee }),
                  ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen")
              })
          })

          describe("checkUpKeep", () => {
              it("returns false if people haven't sent any ETH", async () => {
                  await network.provider.send("evm_increaseTime", [
                      ethers.toNumber(interval) + 1,
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  const { upkeepNeeded } =
                      await raffle.checkUpkeep.staticCall("0x")
                  assert(!upkeepNeeded)
              })
              it("returns fails if raffle isn't open", async () => {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [
                      ethers.toNumber(interval) + 1,
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  await raffle.performUpkeep("0x")
                  const raffleState = await raffle.getRaffleState()
                  const { upkeepNeeded } =
                      await raffle.checkUpkeep.staticCall("0x")
                  assert.equal(raffleState.toString(), "1")
                  assert.equal(upkeepNeeded, false)
              })
              it("returns false if enough time hasn't passed", async () => {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [
                      ethers.toNumber(interval) - 5,
                  ]) // use a higher number here if this test fails
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  const { upkeepNeeded } =
                      await raffle.checkUpkeep.staticCall("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(!upkeepNeeded)
              })
              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [
                      ethers.toNumber(interval) + 1,
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  const { upkeepNeeded } =
                      await raffle.checkUpkeep.staticCall("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(upkeepNeeded)
              })
          })

          describe("performUpkeep", function () {
              it("can only run if checkupkeep is true", async () => {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [
                      ethers.toNumber(interval) + 1,
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  const tx = await raffle.performUpkeep("0x")
                  assert(tx)
              })
              it("reverts if checkup is false", async () => {
                  await expect(
                      raffle.performUpkeep("0x"),
                  ).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__UpkeepNotNeeded",
                  )
              })
              it("updates the raffle state and emits a requestId", async () => {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [
                      ethers.toNumber(interval) + 1,
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  const txResponse = await raffle.performUpkeep("0x")
                  const txReceipt = await txResponse.wait(1)
                  const raffleState = await raffle.getRaffleState()
                  const requestId = txReceipt.logs[1].args.requestId
                  assert(ethers.toNumber(requestId) > 0)
                  assert(raffleState == 1)
              })
          })

          describe("fulfillRandomWords", () => {
              beforeEach(async () => {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [
                      ethers.toNumber(interval) + 1,
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
              })
              it("Can only be called after performUpkeep", async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffleAddress),
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffleAddress),
                  ).to.be.revertedWith("nonexistent request")
              })
              it("picks a winner, resets the lottery and send the money", async () => {
                  const additionalEntrants = 3
                  const startingAccountIndex = 1
                  const accounts = await ethers.getSigners()
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrants;
                      i++
                  ) {
                      const accountConnectedRaffle = raffle.connect(accounts[i])
                      await accountConnectedRaffle.enterRaffle({
                          value: entranceFee,
                      })
                  }
                  const startingTimeStamp = await raffle.getLatestTimeStamp()
                  //   performUpkeep (mock being chainlink keeper)
                  // fulfillRandomWords (mock being chainlink VRF)
                  //   we will have to wait for the fulfillRandomWords to be called
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("Found the event!")
                          try {
                              const recentWinner =
                                  await raffle.getRecentWinner()
                              console.log(recentWinner)

                              const raffleState = await raffle.getRaffleState()
                              const endingTimeStamp =
                                  await raffle.getLatestTimeStamp()

                              const numPlayers =
                                  await raffle.getNumberOfPlayers()
                              //   const winnerEndingBalance =
                              //       await accounts[1].getBalance()
                              assert.equal(numPlayers.toString(), "0")
                              assert.equal(raffleState.toString(), "0")
                              assert(endingTimeStamp > startingTimeStamp)
                              //   assert.equal(
                              //       winnerEndingBalance.toString(),
                              //       winnerSartingBalance +
                              //           (
                              //               entranceFee * additionalEntrants +
                              //               entranceFee
                              //           ).toString(),
                              //   )
                          } catch (e) {
                              reject(e)
                          }
                          resolve()
                      })
                      const tx = await raffle.performUpkeep("0x")
                      const txReceipt = await tx.wait(1)
                      //   const winnerSartingBalance =
                      //       await accounts[1].getBalance()
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.logs[1].args.requestId,
                          raffleAddress,
                      )
                  })
              })
          })
      })
