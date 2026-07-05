import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { runner } from 'node-pg-migrate';
import { join } from 'node:path';

// Runs the shared pipeline in `database/migrations/` on boot, before any pg query
// (queries start at onApplicationBootstrap; this is onModuleInit). node-pg-migrate
// opens its own connection and takes an advisory lock, so concurrent instance boots
// serialise safely. The .sql files are copied into the bundle (dist/apps/api/migrations)
// by webpack — Render ships only dist, so they can't be read from the repo root.
@Injectable()
export class Migrations implements OnModuleInit {
  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly logger: Logger = new Logger(Migrations.name),
  ) {}

  async onModuleInit(): Promise<void> {
    const dir = join(__dirname, 'migrations');
    this.logger.log(`Applying migrations from ${dir}`);
    await runner({
      databaseUrl: this.config.getOrThrow<string>('DATABASE_CONNECTION_STRING'),
      dir,
      direction: 'up',
      count: Infinity,
      migrationsTable: 'pgmigrations',
    });
    this.logger.log('Migrations applied');
  }
}
