import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';
import { DISCRIMINATION_PAIRS } from '../server/nvm/analyze/calibration/discrimination-pairs.ts';

const pair = DISCRIMINATION_PAIRS.find(p => p.id === 'composite-reviewer-scenario');
const [good, bad] = await Promise.all([
  runScriptDoctor(pair.good.fountain, {}, 'quick'),
  runScriptDoctor(pair.bad.fountain, {}, 'quick'),
]);
console.log('composite gap:', (good.health - bad.health).toFixed(1), '(need >= 5.0)');
console.log('good health:', good.health, '| bad health:', bad.health);
