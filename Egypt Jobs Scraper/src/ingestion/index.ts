import { batchIngest } from './batch_ingest';

async function main() {
  console.log('🚀 Egypt Career Map — Batch Ingestion Pipeline');
  console.log('================================================\n');

  const fileArgs = process.argv.slice(2);
  const results = await batchIngest(
    fileArgs.length > 0
      ? fileArgs.map((f) => ({ path: f }))
      : undefined
  );

  console.log('\n================================================');
  console.log('📊 Ingestion Summary:');
  let total = 0;
  for (const r of results) {
    console.log(`   ${r.file}: +${r.inserted} / ~${r.updated} (${r.skipped} skipped, ${r.errors} errors)`);
    total += r.inserted + r.updated;
  }
  console.log(`\n✅ Total records processed: ${total}`);
  console.log('================================================');
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
