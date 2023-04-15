import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
import { AirdropHelper } from '../wrappers/AirdropHelper';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

describe('AirdropHelper', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('AirdropHelper');
    });

    let blockchain: Blockchain;
    let airdropHelper: SandboxContract<AirdropHelper>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        airdropHelper = blockchain.openContract(AirdropHelper.createFromConfig({}, code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await airdropHelper.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: airdropHelper.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and airdropHelper are ready to use
    });
});
