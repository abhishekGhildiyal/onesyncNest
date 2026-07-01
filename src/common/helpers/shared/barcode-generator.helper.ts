import { InjectConnection } from '@nestjs/sequelize';
import { Injectable } from '@nestjs/common';
import { Sequelize, Transaction } from 'sequelize';
import { StoreRepository } from 'src/db/repository/store.repository';

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

@Injectable()
export class BarcodeGeneratorHelper {
  constructor(
    private readonly storeRepo: StoreRepository,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {}

  async getNextSequenceId(storeId: number, transaction: Transaction | null = null): Promise<number> {
    const t = transaction || (await this.sequelize.transaction());
    try {
      let sequenceRecord = await this.storeRepo.storeBarcodeSequenceModel.findOne({
        where: { store_id: storeId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      let nextValue: number;

      if (sequenceRecord) {
        nextValue = (sequenceRecord.sequence_value || 0) + 1;
        await this.storeRepo.storeBarcodeSequenceModel.update(
          { sequence_value: nextValue },
          { where: { store_id: storeId }, transaction: t },
        );
      } else {
        nextValue = 1;
        await this.storeRepo.storeBarcodeSequenceModel.create(
          { store_id: storeId, sequence_value: nextValue },
          { transaction: t },
        );
      }

      if (!transaction) await t.commit();
      return nextValue;
    } catch (error) {
      if (!transaction) await t.rollback();
      console.error('Error generating next sequence ID:', error);
      throw error;
    }
  }

  async getNextSequenceRange(
    storeId: number,
    count: number,
    transaction: Transaction | null = null,
  ): Promise<number> {
    if (count <= 0) return 0;
    const t = transaction || (await this.sequelize.transaction());
    try {
      let sequenceRecord = await this.storeRepo.storeBarcodeSequenceModel.findOne({
        where: { store_id: storeId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      let startValue: number;

      if (sequenceRecord) {
        startValue = (sequenceRecord.sequence_value || 0) + 1;
        const newEndValue = (sequenceRecord.sequence_value || 0) + count;
        await this.storeRepo.storeBarcodeSequenceModel.update(
          { sequence_value: newEndValue },
          { where: { store_id: storeId }, transaction: t },
        );
      } else {
        startValue = 1;
        await this.storeRepo.storeBarcodeSequenceModel.create(
          { store_id: storeId, sequence_value: count },
          { transaction: t },
        );
      }

      if (!transaction) await t.commit();
      return startValue;
    } catch (error) {
      if (!transaction) await t.rollback();
      console.error('Error generating next sequence rangeID:', error);
      throw error;
    }
  }

  generateUniqueId(length: number): string {
    if (length < 8 || length > 10) {
      throw new Error('Length must be between 8 and 10');
    }

    let uniqueId = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * CHARACTERS.length);
      uniqueId += CHARACTERS.charAt(randomIndex);
    }
    return uniqueId;
  }
}
