import Ajv2020 from "ajv/dist/2020.js";
import packSchema from "../../schema/pack.schema.json" with { type: "json" };
import lexiconSchema from "../../schema/lexicon.schema.json" with { type: "json" };

const ajv = new Ajv2020({ allErrors: true, strict: true });

export const validatePackSchema = ajv.compile(packSchema);
export const validateLexiconSchema = ajv.compile(lexiconSchema);
