# ccip-ens-deploy-config-usage

This is an ETH Global Hackathon project that demonstrates how to use Chainlink CCIP to commit and register an ENS name from different chains.

## Install dependencies

You can use npm, yarn or even pnpm to install the dependencies.

```bash
yarn
```

## Compile to prepare Type-chain

```bash
yarn compile
```

## Deploy the contracts

Also configures the L1 contract to allow L2 as a sender.

```bash
yarn deploy
```

## Commit ENS name

```bash
yarn commit
```

## Register ENS name

```bash
yarn register
```
