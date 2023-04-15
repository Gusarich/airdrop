import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
import { Airdrop } from '../wrappers/Airdrop';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

describe('Airdrop', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Airdrop');
    });

    let blockchain: Blockchain;
    let airdrop: SandboxContract<Airdrop>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        airdrop = blockchain.openContract(Airdrop.createFromConfig({}, code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await airdrop.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: airdrop.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and airdrop are ready to use
    });
});
