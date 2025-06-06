import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1749201404748 implements MigrationInterface {
    name = 'InitialSchema1749201404748'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "nft" ("id" SERIAL NOT NULL, "tokenId" character varying(64) NOT NULL, "owner" character varying(42) NOT NULL, "mintedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fab00ba947584a1eb04e9c70552" UNIQUE ("tokenId"), CONSTRAINT "PK_8f46897c58e23b0e7bf6c8e56b0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "auctions" ("id" SERIAL NOT NULL, "address" character varying(42) NOT NULL, "tokenId" character varying(64) NOT NULL, "creator" character varying(42) NOT NULL, "status" "public"."auctions_status_enum" NOT NULL DEFAULT 'created', "highestBid" numeric(18,8) NOT NULL DEFAULT '0', "highestBidder" character varying(42), "minBidIncrement" numeric(18,8) NOT NULL DEFAULT '0.01', "duration" bigint NOT NULL DEFAULT '259200', "startedAt" TIMESTAMP, "endedAt" TIMESTAMP, "cancelledAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_735d76435570c6eb18cadaf5d37" UNIQUE ("address"), CONSTRAINT "PK_87d2b34d4829f0519a5c5570368" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "walletAddress" character varying(42) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_efbd1135797e451d834bcf88cd2" UNIQUE ("walletAddress"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "auctions"`);
        await queryRunner.query(`DROP TABLE "nft"`);
    }

}
