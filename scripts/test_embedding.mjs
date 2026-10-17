import { pipeline } from '@xenova/transformers';

console.log('Testing embedding generation...');
const extractor = await pipeline('feature-extraction', 'Snowflake/snowflake-arctic-embed-s');
console.log('Extractor loaded!');
const output = await extractor('Represent this sentence for searching relevant passages: What is ROUGE-K?', {
  pooling: 'cls',
  normalize: false
});
const vec = output.tolist()[0];
console.log('Vector generated! Length:', vec.length);
