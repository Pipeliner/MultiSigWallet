const MultiSigWallet = artifacts.require('MultiSigWallet');
const web3 = MultiSigWallet.web3;
const TestToken = artifacts.require('TestToken');
const TestCalls = artifacts.require('TestCalls');

const deployMultisig = (owners, confirmations) => {
    return MultiSigWallet.new(owners, confirmations);
};
const deployToken = () => {
	return TestToken.new();
};
const deployCalls = () => {
	return TestCalls.new();
};

const utils = require('./utils');

contract('MultiSigWallet', (accounts) => {
    let multisigInstance;
    let tokenInstance;
    let callsInstance;
    const requiredConfirmations = 2;

    beforeEach(async () => {
        multisigInstance = await deployMultisig([accounts[0], accounts[1]], requiredConfirmations);
        assert.ok(multisigInstance);
        tokenInstance = await deployToken();
        assert.ok(tokenInstance);
        callsInstance = await deployCalls();
        assert.ok(callsInstance);

        const deposit = 10000000;

        // Send money to wallet contract
        await new Promise((resolve, reject) => web3.eth.sendTransaction({to: multisigInstance.address, value: deposit, from: accounts[0]}, e => (e ? reject(e) : resolve())));
        const balance = await utils.balanceOf(web3, multisigInstance.address);
        assert.equal(balance.valueOf(), deposit);
    });

    it('token minting requires two signatures', async () => {
        await tokenInstance.transferOwnership(multisigInstance.address);
        const address = multisigInstance.address;
        const initialBalance = await tokenInstance.balanceOf(address);
        const amountToMint = 1000000;
        const mintEncoded = tokenInstance.contract.mint.getData(address, amountToMint);
        const transactionId = utils.getParamFromTxEvent(
            await multisigInstance.submitTransaction(tokenInstance.address, 0, mintEncoded  , {from: accounts[0]}),
            'transactionId', null, 'Submission');

        const newBalance = await tokenInstance.balanceOf(address);
        assert.equal(newBalance.toString(), initialBalance.toString());

        const executedTransactionId = utils.getParamFromTxEvent(
            await multisigInstance.confirmTransaction(transactionId, {from: accounts[1]}),
            'transactionId', null, 'Execution');

        const newBalance2 = await tokenInstance.balanceOf(address);

        assert.ok(transactionId.equals(executedTransactionId));
        assert.equal(newBalance2.toString(), initialBalance.add(amountToMint).toString());
    });

    it('sending ether from the token contract requires two signatures', async () => {
        await tokenInstance.transferOwnership(multisigInstance.address);
        const address = accounts[2];
        const amountToSend = 5;
        await web3.eth.sendTransaction({to: tokenInstance.address, value: amountToSend, from: accounts[0]});

        const initialBalance = await web3.eth.getBalance(address);

        const sendEtherEncoded = tokenInstance.contract.sendEther.getData(address, amountToSend);
        const transactionId = utils.getParamFromTxEvent(
            await multisigInstance.submitTransaction(tokenInstance.address, 0, sendEtherEncoded  , {from: accounts[0]}),
            'transactionId', null, 'Submission');

        const newBalance = await web3.eth.getBalance(address);
        assert.equal(newBalance.toString(), initialBalance.toString());

        const executedTransactionId = utils.getParamFromTxEvent(
            await multisigInstance.confirmTransaction(transactionId, {from: accounts[1]}),
            'transactionId', null, 'Execution');

        const newBalance2 = await web3.eth.getBalance(address);

        assert.ok(transactionId.equals(executedTransactionId));
        assert.equal(newBalance2.toString(), initialBalance.add(amountToSend).toString());
    });

    it('transfer fails before we enable it', async () => {
        // Issue tokens to the multisig address
        const issueResult = await tokenInstance.mint(multisigInstance.address, 1000000, {from: accounts[0]});
        assert.ok(issueResult);
        // Encode transfer call for the multisig
        const transferEncoded = tokenInstance.contract.transfer.getData(accounts[1], 1000000);
        const transactionId = utils.getParamFromTxEvent(
            await multisigInstance.submitTransaction(tokenInstance.address, 0, transferEncoded, {from: accounts[0]}),
            'transactionId', null, 'Submission');
        // Transfer without issuance - expected to fail
        const failedTransactionId = utils.getParamFromTxEvent(
            await multisigInstance.confirmTransaction(transactionId, {from: accounts[1]}),
            'transactionId', null, 'ExecutionFailure');
        // Check that transaction has been executed
        assert.ok(transactionId.equals(failedTransactionId));
    });

    it('transfer works after we enable it', async () => {
        // Issue tokens to the multisig address
        const issueResult = await tokenInstance.mint(multisigInstance.address, 1000000, {from: accounts[0]});
        assert.ok(issueResult);

        await tokenInstance.transferOwnership(multisigInstance.address);

        const enableTransfersEncoded = tokenInstance.contract.allowTransfers.getData();
        const enablingTransactionId = utils.getParamFromTxEvent(
            await multisigInstance.submitTransaction(tokenInstance.address, 0, enableTransfersEncoded, {from: accounts[0]}),
            'transactionId', null, 'Submission');

        const executedEnablingTransactionId = utils.getParamFromTxEvent(
            await multisigInstance.confirmTransaction(enablingTransactionId, {from: accounts[1]}),
            'transactionId', null, 'Execution');
        // Check that transaction has been executed
        assert.ok(enablingTransactionId.equals(executedEnablingTransactionId));

        // Encode transfer call for the multisig
        const transferEncoded = tokenInstance.contract.transfer.getData(accounts[1], 1000000);
        const transactionId = utils.getParamFromTxEvent(
            await multisigInstance.submitTransaction(tokenInstance.address, 0, transferEncoded, {from: accounts[0]}),
            'transactionId', null, 'Submission');

        const executedTransactionId = utils.getParamFromTxEvent(
            await multisigInstance.confirmTransaction(transactionId, {from: accounts[1]}),
            'transactionId', null, 'Execution');
        // Check that transaction has been executed
        assert.ok(transactionId.equals(executedTransactionId));
        // Check that the transfer has actually occured
        assert.equal(
            1000000,
            await tokenInstance.balanceOf(accounts[1])
        );
    });

    it('transferFailure', async () => {
        // Encode transfer call for the multisig
        const transferEncoded = tokenInstance.contract.transfer.getData(accounts[1], 1000000);
        const transactionId = utils.getParamFromTxEvent(
            await multisigInstance.submitTransaction(tokenInstance.address, 0, transferEncoded, {from: accounts[0]}),
            'transactionId', null, 'Submission');
        // Transfer without issuance - expected to fail
        const failedTransactionId = utils.getParamFromTxEvent(
            await multisigInstance.confirmTransaction(transactionId, {from: accounts[1]}),
            'transactionId', null, 'ExecutionFailure');
        // Check that transaction has been executed
        assert.ok(transactionId.equals(failedTransactionId));
    });
});
