import { getDbWriter } from '../../../database/db_sink';
import type { JobSink, JobRecord } from './CsvSink';

export class DbSink implements JobSink {
  private writer = getDbWriter();

  init() {}

  write(job: JobRecord) {
    this.writer.upsertJobRecord(job).catch((err) => {
      console.error('[DbSink] Error writing job to DB:', err);
    });
  }

  close() {}
}
