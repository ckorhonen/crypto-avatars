import { ethers } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';
import { logger } from '../utils/logger';
import { BlockchainType } from '../types';

class BlockchainService {
  private ethereumProvider: ethers.JsonRpcProvider | null = null;
  private solanaConnection: Connection | null = null;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    try {
      const ethereumRpcUrl = process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/your-project-id';
      this.ethereumProvider = new ethers.JsonRpcProvider(ethereumRpcUrl);
      logger.info('Ethereum provider initialized');

      const solanaRpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
      this.solanaConnection = new Connection(solanaRpcUrl, 'confirmed');
      logger.info('Solana connection initialized');
    } catch (error) {
      logger.error('Failed to initialize blockchain providers:', error);
    }
  }

  async verifyWalletOwnership(walletAddress: string, blockchain: BlockchainType): Promise<boolean> {
    try {
      switch (blockchain) {
        case 'ethereum':
        case 'polygon':
        case 'bsc':
          return this.verifyEthereumWallet(walletAddress);
        case 'solana':
          return this.verifySolanaWallet(walletAddress);
        case 'bitcoin':
          return this.verifyBitcoinWallet(walletAddress);
        default:
          logger.warn(`Unsupported blockchain: ${blockchain}`);
          return false;
      }
    } catch (error) {
      logger.error(`Error verifying wallet for ${blockchain}:`, error);
      return false;
    }
  }

  private async verifyEthereumWallet(address: string): Promise<boolean> {
    try {
      if (!ethers.isAddress(address)) {
        return false;
      }

      if (this.ethereumProvider) {
        const transactionCount = await this.ethereumProvider.getTransactionCount(address);
        logger.debug(`Ethereum wallet ${address} transaction count: ${transactionCount}`);
      }

      return true;
    } catch (error) {
      logger.error('Error verifying Ethereum wallet:', error);
      return false;
    }
  }

  private async verifySolanaWallet(address: string): Promise<boolean> {
    try {
      const publicKey = new PublicKey(address);
      
      if (!PublicKey.isOnCurve(publicKey)) {
        return false;
      }

      if (this.solanaConnection) {
        const accountInfo = await this.solanaConnection.getAccountInfo(publicKey);
        logger.debug(`Solana wallet ${address} account info:`, accountInfo ? 'exists' : 'not found');
      }

      return true;
    } catch (error) {
      logger.error('Error verifying Solana wallet:', error);
      return false;
    }
  }

  private verifyBitcoinWallet(address: string): boolean {
    try {
      const legacyRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
      const bech32Regex = /^bc1[a-z0-9]{39,59}$/;
      
      return legacyRegex.test(address) || bech32Regex.test(address);
    } catch (error) {
      logger.error('Error verifying Bitcoin wallet:', error);
      return false;
    }
  }

  async validateSignature(
    message: string,
    signature: string,
    walletAddress: string,
    blockchain: BlockchainType
  ): Promise<boolean> {
    try {
      switch (blockchain) {
        case 'ethereum':
        case 'polygon':
        case 'bsc':
          return this.validateEthereumSignature(message, signature, walletAddress);
        case 'solana':
          logger.warn('Solana signature validation not fully implemented');
          return false;
        default:
          logger.warn(`Signature validation not supported for ${blockchain}`);
          return false;
      }
    } catch (error) {
      logger.error(`Error validating signature for ${blockchain}:`, error);
      return false;
    }
  }

  private validateEthereumSignature(message: string, signature: string, expectedAddress: string): boolean {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
      logger.error('Error validating Ethereum signature:', error);
      return false;
    }
  }
}

export const blockchainService = new BlockchainService();