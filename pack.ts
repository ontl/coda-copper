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

/**
 * Syncs opportunities from Copper
 */
pack.addSyncTable({
  name: "Opportunities",
  identityName: "Opportunity",
  schema: schemas.OpportunitySchema,
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
  identityName: "Company",
  schema: schemas.CompanySchema,
  formula: {
    name: "SyncCompanies",
    description: "Sync companies from Copper",
    parameters: [],
    execute: async function ([], context) {
      return helpers.syncCompanies(context);
    },
  },
});
