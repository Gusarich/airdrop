import { toNano } from 'ton-core';
import { AirdropHelper } from '../wrappers/AirdropHelper';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const airdropHelper = provider.open(AirdropHelper.createFromConfig({}, await compile('AirdropHelper')));

    await airdropHelper.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(airdropHelper.address);

    // run methods on `airdropHelper`
}
