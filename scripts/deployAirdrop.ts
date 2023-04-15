import { toNano } from 'ton-core';
import { Airdrop } from '../wrappers/Airdrop';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const airdrop = provider.open(Airdrop.createFromConfig({}, await compile('Airdrop')));

    await airdrop.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(airdrop.address);

    // run methods on `airdrop`
}
