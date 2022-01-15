import * as coda from "@codahq/packs-sdk";
import * as helpers from "./helpers";
import * as schemas from "./schemas";

export const pack = coda.newPack();

pack.addNetworkDomain("copper.com");
pack.setUserAuthentication({
  type: coda.AuthenticationType.Custom,
  params: [
    {
      name: "apiKey",
      description: "API Key from Copper (Settings > Integrations > API Keys)",
    },
    {
      name: "email",
      description: "The email associated with your Copper account",
    },
  ],
  instructionsUrl:
    "https://developer.copper.com/introduction/authentication.html",
});

/* -------------------------------------------------------------------------- */
/*                                 Sync Tables                                */
/* -------------------------------------------------------------------------- */

/**
 * Syncs opportunities from Copper
 */
pack.addSyncTable({
  name: "Opportunities",
  schema: schemas.OpportunitySchema,
  identityName: "Opportunity",
  formula: {
    name: "SyncOpportunities",
    description: "Sync opportunities from Copper",
    parameters: [],
    execute: async function ([], context) {
      return helpers.syncOpportunities(context);
    },
  },
});

/**
 * Syncs companies from Copper
 */
pack.addSyncTable({
  name: "Companies",
  schema: schemas.CompanySchema,
  identityName: "Company",
  formula: {
    name: "SyncCompanies",
    description: "Sync companies from Copper",
    parameters: [],
    execute: async function ([], context) {
      return helpers.syncCompanies(context);
    },
  },
});

/**
 * Syncs people from Copper
 */
pack.addSyncTable({
  name: "People",
  schema: schemas.PersonSchema,
  identityName: "Person",
  formula: {
    name: "SyncPeople",
    description: "Sync people from Copper",
    parameters: [],
    execute: async function ([], context) {
      return helpers.syncPeople(context);
    },
  },
});

/* -------------------------------------------------------------------------- */
/*                                  Formulas                                  */
/* -------------------------------------------------------------------------- */

// Read-only formulas

pack.addFormula({
  name: "Opportunity",
  description:
    "Gets all the details of a Copper Opportunity, based on its by URL or ID",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "urlOrId",
      description: "The URL or ID of the opportunity",
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: schemas.OpportunitySchema,
  execute: async function ([urlOrId], context) {
    return helpers.getOpportunity(context, urlOrId);
  },
});

pack.addFormula({
  name: "Company",
  description:
    "Gets all the details of a Copper Company, based on its by URL or ID",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "urlOrId",
      description: "The URL or ID of the company",
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: schemas.CompanySchema,
  execute: async function ([urlOrId], context) {
    return helpers.getCompany(context, urlOrId);
  },
});

pack.addFormula({
  name: "Person",
  description:
    "Gets all the details of a Copper Person (contact), based on its by URL or ID",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "urlOrId",
      description: "The URL or ID of the person",
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: schemas.PersonSchema,
  execute: async function ([urlOrId], context) {
    return helpers.getPerson(context, urlOrId);
  },
});

/* -------------------------------------------------------------------------- */
/*                               Column Formats                               */
/* -------------------------------------------------------------------------- */

pack.addColumnFormat({
  name: "Opportunity",
  instructions:
    "Displays all the details of Copper Opportunities, based on their URL or ID",
  formulaName: "Opportunity",
  matchers: [helpers.copperOpportunityUrlRegex],
});

pack.addColumnFormat({
  name: "Company",
  instructions:
    "Displays all the details of Copper Companies, based on their URL or ID",
  formulaName: "Company",
  matchers: [helpers.copperCompanyUrlRegex],
});

pack.addColumnFormat({
  name: "Person",
  instructions:
    "Displays all the details of Copper People (contacts), based on their URL or ID",
  formulaName: "Person",
  matchers: [helpers.copperPersonUrlRegex],
});
