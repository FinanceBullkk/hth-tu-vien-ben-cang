// Dựng model thú cưng theo id trong shared/pets.js. Mỗi thú trả về khung chung của pet-model-kit.js.
import { PETS } from '../../../shared/pets.js';
import { buildCat, buildDog, buildPanda, buildRabbit, buildTurtle } from './pet-models-common.js';
import { buildDragon, buildQilin } from './pet-models-divine.js';
import { buildCrane, buildFox } from './pet-models-spirit.js';

const BUILDERS = {
  meo_muop: buildCat,
  cho_co: buildDog,
  tho_trang: buildRabbit,
  gau_truc: buildPanda,
  rua_ngoc: buildTurtle,
  ho_ly: buildFox,
  hac_tien: buildCrane,
  ky_lan: buildQilin,
  rong_con: buildDragon,
};

/** Model của thú kind; id lạ (bản client cũ hơn server) thì dựng mèo cho khỏi lỗi. */
export function buildPet(kind) {
  const spec = PETS[kind] ?? PETS[0];
  const model = (BUILDERS[spec.key] ?? buildCat)();
  model.kind = kind;
  return model;
}
