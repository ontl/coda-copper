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
